import { describe, expect, it } from 'vitest';

import { FatalError } from '../src/domain/config';
import { embed_api_batch } from '../src/ui/embed-adapters/api-adapter-batch';
import type { EmbedModelApiAdapter } from '../src/ui/embed-adapters/api-base';

function fakeAdapter(limit: number) {
  const sent: number[] = [];
  const adapter = {
    requires_api_key: false,
    max_tokens: 10_000,
    request_token_budget: 10_000,
    prepare_embed_input: async (s: string) => s,
    count_tokens: async (s: string) => s.length,
    req_adapter: class { constructor(_a: unknown, public inputs: string[]) {} to_platform() { return { inputs: this.inputs }; } },
    res_adapter: class { constructor(_a: unknown, public r: { n: number }) {} to_openai() { return [{ vec: [this.r.n], tokens: this.r.n }]; } },
    request: async (req: { inputs: string[] }) => {
      const len = req.inputs[0]!.length;
      sent.push(len);
      if (len > limit) throw new FatalError('4419 tokens > 4000 limit', 400);
      return { n: len };
    },
  } as unknown as EmbedModelApiAdapter;
  return { adapter, sent };
}

describe('embed_api_batch token-limit retry', () => {
  it('shrinks and retries when the API rejects the batch as over the token limit', async () => {
    const { adapter, sent } = fakeAdapter(500);
    const [res] = await embed_api_batch(adapter, [{ embed_input: 'x'.repeat(1000) }]);
    expect(sent).toEqual([1000, 700, 489]);
    expect(res?.vec).toEqual([489]);
  });

  it('gives up after the retry cap', async () => {
    const { adapter, sent } = fakeAdapter(1);
    await expect(embed_api_batch(adapter, [{ embed_input: 'x'.repeat(1000) }])).rejects.toBeInstanceOf(FatalError);
    expect(sent).toHaveLength(4);
  });
});
