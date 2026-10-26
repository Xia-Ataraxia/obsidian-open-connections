import { describe, expect, it } from 'vitest';

import {
  applyContentRules,
  CONTENT_RULE_PRESETS,
  normalizeContentRules,
  parseContentRules,
} from '../src/utils/content-rules';

const [aliased, urls, images] = CONTENT_RULE_PRESETS.map((p) => p.pattern);

describe('content rules', () => {
  it('strips presets from note content', () => {
    const text = 'see [[Note|alias]] and [[Plain]] at https://example.com/a?b=1 ![[pic.png]] ![alt](x.png) end';
    expect(applyContentRules(text, [aliased, urls, images].join('\n')))
      .toBe('see  and [[Plain]] at    end');
  });

  it('reports invalid patterns without throwing and keeps valid ones', () => {
    const parsed = parseContentRules('([\nfoo');
    expect(parsed.invalid).toEqual(['([']);
    expect(applyContentRules('a foo b', '([\nfoo')).toBe('a  b');
  });

  it('is a no-op for empty rules', () => {
    expect(applyContentRules('abc', '')).toBe('abc');
    expect(applyContentRules('abc', undefined)).toBe('abc');
  });

  it('normalizes whitespace and blank lines', () => {
    expect(normalizeContentRules(' a \n\n b ')).toBe('a\nb');
  });
});

describe('embed input', () => {
  it('applies rules to source input and leaves it empty when nothing remains', async () => {
    const { cacheEmbeddingSourceInput } = await import('../src/domain/entities/embedding-source-content');
    const make = () => ({
      path: 'a/b.md',
      _embed_input: null as string | null,
      collection: { settings: { content_rules: urls } },
    });
    const src = make();
    await cacheEmbeddingSourceInput(src as never, 'hello https://x.io/y world');
    expect(src._embed_input).toBe('a > b:\nhello  world');
    const only = make();
    await cacheEmbeddingSourceInput(only as never, 'https://x.io/y');
    expect(only._embed_input).toBe('');
  });
});
