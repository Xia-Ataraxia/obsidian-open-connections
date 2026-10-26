import { describe, expect, it, vi } from 'vitest';

vi.mock('obsidian', () => {
  class TFile { constructor(public path: string, public extension: string) {} }
  class TFolder { constructor(public path: string, public children: unknown[]) {} }
  return { TFile, TFolder };
});

import { TFile, TFolder } from 'obsidian';
import { collectFolderSources } from '../src/ui/collection-processing';

const file = (path: string) => new (TFile as never as new (p: string, e: string) => TFile)(path, path.split('.').pop() ?? '');
const folder = (path: string, children: unknown[]) =>
  new (TFolder as never as new (p: string, c: unknown[]) => TFolder)(path, children);

describe('collectFolderSources', () => {
  it('walks only the given folder and keeps md/txt notes', () => {
    const picked = folder('a', [file('a/one.md'), file('a/img.png'), folder('a/b', [file('a/b/two.txt')])]);
    expect(collectFolderSources(picked).map((f) => f.path)).toEqual(['a/one.md', 'a/b/two.txt']);
  });
});
