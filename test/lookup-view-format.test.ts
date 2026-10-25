import { describe, expect, it } from 'vitest';
import { splitNoteKey } from '../src/ui/lookup-view-format';

describe('splitNoteKey', () => {
  it('returns the bare path for a note key', () => {
    expect(splitNoteKey('Folder/Note.md')).toEqual({ path: 'Folder/Note.md', heading: '' });
  });

  it('returns the deepest heading for a block key', () => {
    expect(splitNoteKey('Folder/Note.md#Intro#Details')).toEqual({ path: 'Folder/Note.md', heading: 'Details' });
  });
});
