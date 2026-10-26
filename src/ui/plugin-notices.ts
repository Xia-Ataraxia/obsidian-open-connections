import { Notice, setIcon, setTooltip } from 'obsidian';
import type { NoticeCatalog } from '../types/settings';

export interface NoticeShowOptions {
	timeout?: number;
	button?: { text: string; callback: () => void };
}

export interface PluginNoticesHost {
	settings: Record<string, unknown>;
	saveSettings(): Promise<void>;
	onMutedChange?(): void;
}

const BUILTIN_TEMPLATES: Record<string, string> = {
	notice_muted: 'Notice muted. Undo in settings.',
};

export class PluginNotices {
	private readonly active = new Map<string, Notice>();
	private readonly activeTimers = new Map<string, number>();

	constructor(
		private readonly plugin: PluginNoticesHost,
		private readonly catalog: NoticeCatalog,
		private readonly prefix: string,
	) {}

	show(id: string, params?: Record<string, unknown>, opts?: NoticeShowOptions): Notice | null {
		if (this.isMuted(id)) return null;

		const definition = this.catalog[id];
		const template = definition?.template ?? BUILTIN_TEMPLATES[id] ?? id;
		const timeout = opts?.timeout ?? definition?.timeout ?? 5000;
		const immutable = definition?.immutable ?? false;

		const message = this.interpolate(template, params ?? {});
		const fragment = this.buildFragment(id, message, { button: opts?.button, immutable });

		const existing = this.active.get(id);
		if (existing) {
			existing.setMessage(fragment);
			this.scheduleCleanup(id, timeout);
			return existing;
		}

		const notice = new Notice(fragment, timeout);
		this.active.set(id, notice);
		this.scheduleCleanup(id, timeout);
		return notice;
	}

	remove(id: string): void {
		this.active.get(id)?.hide();
		this.active.delete(id);

		const timer = this.activeTimers.get(id);
		if (timer !== undefined) {
			window.clearTimeout(timer);
			this.activeTimers.delete(id);
		}
	}

	async mute(id: string): Promise<void> {
		const store = this.getMutedStore();
		store[id] = true;
		await this.plugin.saveSettings();
		this.plugin.onMutedChange?.();
	}

	async unmute(id: string): Promise<void> {
		const store = this.getMutedStore();
		if (store[id]) {
			delete store[id];
			await this.plugin.saveSettings();
			this.plugin.onMutedChange?.();
		}
	}

	async unmuteAll(): Promise<void> {
		const store = this.getMutedStore();
		if (Object.keys(store).length === 0) return;
		this.getPluginNoticesSettings().muted = {};
		await this.plugin.saveSettings();
		this.plugin.onMutedChange?.();
	}

	isMuted(id: string): boolean {
		const store = this.getMutedStore();
		return store[id] === true;
	}

	listMuted(): string[] {
		const store = this.getMutedStore();
		return Object.keys(store)
			.filter((k) => store[k] === true)
			.sort();
	}

	has(id: string): boolean {
		return this.catalog[id] !== undefined;
	}

	unload(): void {
		for (const id of this.active.keys()) {
			this.remove(id);
		}
	}

	private getMutedStore(): Record<string, boolean> {
		return this.getPluginNoticesSettings().muted;
	}

	private getPluginNoticesSettings(): { muted: Record<string, boolean> } {
		const settings = this.plugin.settings;

		if (!settings['plugin_notices'] || typeof settings['plugin_notices'] !== 'object') {
			settings['plugin_notices'] = { muted: {} };
		}

		const notices = settings['plugin_notices'] as Record<string, unknown>;

		if (!notices['muted'] || typeof notices['muted'] !== 'object') {
			notices['muted'] = {};
		}

		return notices as { muted: Record<string, boolean> };
	}

	private interpolate(template: string, params: Record<string, unknown>): string {
		return template.replace(/{{\s*([\w.-]+)\s*}}/g, (_match, key: string) => {
			const value = params[key];
			if (value === null || value === undefined) return '';
			if (typeof value === 'string') return value;
			if (typeof value === 'number' || typeof value === 'boolean') return String(value);
			return JSON.stringify(value);
		});
	}

	private buildFragment(
		id: string,
		text: string,
		opts: { button?: { text: string; callback: () => void }; immutable: boolean },
	): DocumentFragment {
		const fragment = createFragment();
		const wrapper = fragment.createDiv({ cls: 'osc-notice' });
		wrapper.createDiv({ cls: 'osc-notice-head', text: this.prefix });

		const row = wrapper.createDiv({ cls: 'osc-notice-row' });
		row.createEl('p', { cls: 'osc-notice-content', text });
		if (!opts.immutable) this.createMuteButton(row, id);

		const button = opts.button;
		if (button?.text && typeof button.callback === 'function') {
			const actions = wrapper.createDiv({ cls: 'osc-notice-actions' });
			actions.createEl('button', { type: 'button', text: button.text }).addEventListener('click', () => {
				button.callback();
				this.remove(id);
			});
		}

		return fragment;
	}

	private createMuteButton(parent: HTMLElement, id: string): void {
		const button = parent.createEl('button', { cls: 'clickable-icon osc-notice-mute', type: 'button' });
		setIcon(button, 'bell-off');
		setTooltip(button, 'Mute this notice');
		button.addEventListener('click', () => {
			void this.mute(id)
				.then(() => {
					this.remove(id);
					this.show('notice_muted', {}, { timeout: 2000 });
				})
				.catch((err: unknown) => {
					console.error(`[${this.prefix}] Failed to mute notice:`, err);
				});
		});
	}

	private scheduleCleanup(id: string, timeout: number): void {
		const existing = this.activeTimers.get(id);
		if (existing !== undefined) {
			window.clearTimeout(existing);
			this.activeTimers.delete(id);
		}
		if (timeout <= 0) return;

		const timer = window.setTimeout(() => {
			this.active.delete(id);
			this.activeTimers.delete(id);
		}, timeout + 50);
		this.activeTimers.set(id, timer);
	}
}
