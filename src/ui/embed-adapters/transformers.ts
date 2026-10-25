/**
 * @file transformers.ts
 * @description Public Transformers.js adapter facade; inference runs in a dedicated Web Worker.
 */

import type { EmbedInput, EmbedResult, ModelInfo } from '../../types/models';
import { embedAdapterRegistry } from '../../domain/embed-model';
import { WorkerCrashGate, createSerialQueue, createSingleFlight } from '../../domain/embed-worker-guard';
import { build_transformers_batch_results } from './transformers-batch';
import { EMBED_WORKER_SCRIPT } from './transformers-worker-script';
import { getModelCacheStore } from './transformers-cache';
import { reportModelDownload, resetModelDownload } from './transformers-progress';
import { TRANSFORMERS_EMBED_MODELS } from './transformers-models';

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
  timeout_id: number;
};

type WorkerMessage = {
  type?: 'ready' | 'log' | 'progress' | 'cache_get' | 'cache_put';
  id?: number;
  result?: unknown;
  error?: string;
  message?: string;
  file?: string;
  loaded?: number;
  total?: number;
  cache_id?: number;
  key?: string;
  body?: ArrayBuffer;
};

export { TRANSFORMERS_EMBED_MODELS } from './transformers-models';

export class TransformersEmbedAdapter {
  adapter = 'transformers';
  loaded = false;
  worker: Worker | null = null;
  message_id = 0;
  pending_requests = new Map<number, PendingRequest>();
  private worker_url: string | null = null;
  private readonly crash_gate = new WorkerCrashGate();
  private readonly load_once = createSingleFlight();
  private readonly run_serial = createSerialQueue();
  private static readonly MESSAGE_TIMEOUTS_MS: Record<string, number> = {
    load: 180000,
    unload: 10000,
    count_tokens: 20000,
    embed_batch: 180000,
    get_gpu_diag: 5000,
  };

  constructor(
    public config: {
      adapter: string;
      model_key: string;
      dims: number;
      models: Record<string, ModelInfo>;
      settings: Record<string, unknown>;
      plugin_dir?: string;
      fs_adapter?: unknown;
    },
  ) {}

  get model_key(): string { return this.config.model_key; }
  get dims(): number { return this.config.dims; }
  get models(): Record<string, ModelInfo> { return this.config.models || TRANSFORMERS_EMBED_MODELS; }
  get settings(): Record<string, unknown> { return this.config.settings; }

  private async ensure_loaded(): Promise<void> {
    if (this.loaded) return;
    await this.load_once(() => this.load());
  }

  async load(): Promise<void> {
    if (this.worker && this.loaded) return;
    const blocked = this.crash_gate.blockedReason(Date.now());
    if (blocked) throw new Error(blocked);
    this.dispose_worker();

    console.debug('[Transformers Adapter] Starting embedding worker...');
    this.worker_url = URL.createObjectURL(new Blob([EMBED_WORKER_SCRIPT], { type: 'text/javascript' }));
    const worker = new Worker(this.worker_url, { type: 'module' });
    this.worker = worker;
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => this.handle_message(event.data);
    worker.onerror = (event) => this.handle_crash(event.message || 'worker error');
    worker.onmessageerror = () => this.handle_crash('worker message could not be deserialized');

    resetModelDownload();
    try {
      await this.send_message('load', { model_key: this.model_key });
    } finally {
      resetModelDownload();
    }
    this.loaded = true;
    this.crash_gate.reset();
  }

  async count_tokens(input: string): Promise<number> {
    await this.ensure_loaded();
    const result = await this.run_serial(() => this.send_message('count_tokens', input)) as { tokens: number };
    return result.tokens;
  }

  async embed_batch(inputs: (EmbedInput | { _embed_input: string })[]): Promise<EmbedResult[]> {
    const { results, valid_inputs, valid_indexes } = build_transformers_batch_results(inputs);
    if (valid_inputs.length === 0) return results;

    await this.ensure_loaded();
    const embedded = await this.run_serial(
      () => this.send_message('embed_batch', { inputs: valid_inputs }),
    ) as EmbedResult[];
    for (let i = 0; i < valid_indexes.length && i < embedded.length; i++) {
      const idx = valid_indexes[i];
      const embedding = embedded[i];
      if (idx === undefined || !embedding) continue;
      const result = results[idx];
      if (!result) continue;
      result.vec = embedding.vec;
      result.tokens = embedding.tokens;
      result.key = embedding.key ?? result.key;
      result.index = embedding.index ?? result.index;
    }
    return results;
  }

  async get_gpu_diag(): Promise<unknown> {
    if (!this.worker) return { error: 'worker not available' };
    return this.send_message('get_gpu_diag');
  }

  get_model_info(model_key?: string): ModelInfo | undefined {
    return this.models[model_key || this.model_key];
  }

  unload(): Promise<void> {
    this.dispose_worker();
    return Promise.resolve();
  }

  private send_message(method: string, params?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Embedding worker not started'));
        return;
      }

      const id = this.message_id++;
      const timeout_ms = this.get_timeout_ms(method);
      const timeout_id = window.setTimeout(() => {
        this.reject_pending(id, new Error(`Timed out waiting for worker response: method=${method}, timeoutMs=${timeout_ms}`));
        if (method === 'load') this.dispose_worker();
      }, timeout_ms);
      this.pending_requests.set(id, { resolve, reject, timeout_id });
      this.worker.postMessage({ id, method, params });
    });
  }

  private get_timeout_ms(method: string): number {
    const configured = Number(this.settings?.request_timeout_ms);
    if (Number.isFinite(configured) && configured > 0) {
      return Math.max(1000, configured);
    }
    return TransformersEmbedAdapter.MESSAGE_TIMEOUTS_MS[method] ?? 60000;
  }

  private handle_message(msg: WorkerMessage): void {
    switch (msg.type) {
      case 'ready':
        return;
      case 'log':
        console.debug(String(msg.message ?? ''));
        return;
      case 'progress':
        if (typeof msg.file === 'string') reportModelDownload(msg.file, Number(msg.loaded), Number(msg.total));
        return;
      case 'cache_get':
      case 'cache_put':
        void this.handle_cache_message(msg);
        return;
    }
    if (typeof msg.id !== 'number') return;
    const pending = this.pending_requests.get(msg.id);
    if (!pending) return;
    this.pending_requests.delete(msg.id);
    window.clearTimeout(pending.timeout_id);
    if (msg.error) pending.reject(new Error(msg.error));
    else pending.resolve(msg.result);
  }

  private async handle_cache_message(msg: WorkerMessage): Promise<void> {
    const store = getModelCacheStore();
    const reply: { type: 'cache_reply'; cache_id?: number; hit: boolean; body?: ArrayBuffer } = {
      type: 'cache_reply',
      cache_id: msg.cache_id,
      hit: false,
    };
    try {
      if (store && typeof msg.key === 'string') {
        if (msg.type === 'cache_get') {
          const body = await store.get(msg.key);
          if (body) Object.assign(reply, { hit: true, body });
        } else if (msg.body instanceof ArrayBuffer) {
          await store.put(msg.key, msg.body);
        }
      }
    } catch (error) {
      console.debug('[Transformers Adapter] model cache failure', error);
    }
    this.worker?.postMessage(reply, reply.body ? [reply.body] : []);
  }

  private handle_crash(reason: string): void {
    console.error(`[Transformers Adapter] embedding worker crashed: ${reason}`);
    this.crash_gate.recordCrash(Date.now());
    this.reject_all_pending(new Error(`Embedding worker crashed: ${reason}`));
    this.dispose_worker();
  }

  private reject_pending(id: number, error: Error): void {
    const pending = this.pending_requests.get(id);
    if (!pending) return;
    this.pending_requests.delete(id);
    window.clearTimeout(pending.timeout_id);
    pending.reject(error);
  }

  private reject_all_pending(error: Error): void {
    for (const [id, pending] of this.pending_requests.entries()) {
      window.clearTimeout(pending.timeout_id);
      pending.reject(error);
      this.pending_requests.delete(id);
    }
  }

  private dispose_worker(): void {
    this.reject_all_pending(new Error('Embedding worker stopped before completing requests.'));
    this.worker?.terminate();
    this.worker = null;
    if (this.worker_url) URL.revokeObjectURL(this.worker_url);
    this.worker_url = null;
    this.loaded = false;
  }
}

embedAdapterRegistry.register({
  name: 'transformers',
  displayName: 'Local (Transformers.js)',
  AdapterClass: TransformersEmbedAdapter,
  models: TRANSFORMERS_EMBED_MODELS,
  defaultDims: 384,
  requiresApiKey: false,
  requiresHost: false,
  requiresLoad: true,
  supportsBatch: false,
});
