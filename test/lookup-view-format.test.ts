import { describe, expect, it } from 'vitest';
import { formatLookupBlockIndicator, formatLookupTitle, formatResultHeading, splitNoteKey } from '../src/ui/lookup-view-format';

describe('splitNoteKey', () => {
  it('returns the bare path for a note key', () => {
    expect(splitNoteKey('Folder/Note.md')).toEqual({ path: 'Folder/Note.md', heading: '' });
  });

  it('returns the deepest heading for a block key', () => {
    expect(splitNoteKey('Folder/Note.md#Intro#Details')).toEqual({ path: 'Folder/Note.md', heading: 'Details' });
  });
});

describe('lookup row labels', () => {
  it('titles a block by its note name without the extension or headings', () => {
    expect(formatLookupTitle('Cooking/Pasta Carbonara.md#Pasta Carbonara#Sauce')).toBe('Pasta Carbonara');
    expect(formatLookupTitle('Note.md')).toBe('Note');
  });

  it('drops a top heading that repeats the note title', () => {
    expect(formatLookupBlockIndicator('Cooking/Pasta Carbonara.md#Pasta Carbonara')).toBe('');
    expect(formatLookupBlockIndicator('Cooking/Pasta Carbonara.md#Pasta Carbonara#Sauce')).toBe('Sauce');
    expect(formatLookupBlockIndicator('Cooking/Pasta Carbonara.md#Intro#Sauce')).toBe('Intro > Sauce');
    expect(formatLookupBlockIndicator('Cooking/Pasta Carbonara.md')).toBe('');
    expect(formatLookupBlockIndicator('Cooking/Pasta Carbonara.md#Intro#paragraph-2')).toBe('Intro > Paragraph 2');
  });
});

describe('formatResultHeading', () => {
  it('drops a heading that repeats the note name', () => {
    expect(formatResultHeading('Espresso.md#Espresso', 'Espresso')).toBe('');
    expect(formatResultHeading('Bulk/Topic 1.md#Topic 1', 'Topic 1')).toBe('');
  });

  it('keeps a distinct heading and drops paragraph ids and bare paths', () => {
    expect(formatResultHeading('Espresso.md#Espresso#Dialing in', 'Espresso')).toBe('Dialing in');
    expect(formatResultHeading('Espresso.md#paragraph-2', 'Espresso')).toBe('');
    expect(formatResultHeading('Espresso.md', 'Espresso')).toBe('');
  });
});
