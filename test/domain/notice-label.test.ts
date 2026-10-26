import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { NOTICE_CATALOG, noticeLabel } from '../../src/domain/config';

describe('noticeLabel', () => {
  it('uses the catalog label', () => {
    expect(noticeLabel('folder_exclusion_reconcile_applied')).toBe('Folder exclusion applied');
  });

  it('humanizes ids without a label', () => {
    expect(noticeLabel('embedding_complete')).toBe('Embedding complete');
    expect(noticeLabel('some__new_notice')).toBe('Some new notice');
  });

  it('never returns a raw id for catalog entries', () => {
    for (const id of Object.keys(NOTICE_CATALOG)) expect(noticeLabel(id)).not.toContain('_');
  });

  it('has a catalog entry for every notice id shown in src', () => {
    const files = readdirSync('src', { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'));
    const ids = files.flatMap((f) =>
      [...readFileSync(join('src', f), 'utf8').matchAll(/notices\??\.show\??\.?\(\s*'([a-z_]+)'/g)].map((m) => m[1]),
    );
    expect(ids.length).toBeGreaterThan(10);
    expect(ids.filter((id) => !(id in NOTICE_CATALOG))).toEqual([]);
  });
});
