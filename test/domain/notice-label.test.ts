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
});
