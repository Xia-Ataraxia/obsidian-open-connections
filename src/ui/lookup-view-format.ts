import type { ConnectionResult } from '../types/entities';

export type LookupFilter = 'all' | 'notes' | 'blocks';
export type ScoreTier = 'high' | 'medium' | 'low';

export function scoreTierFor(score: number, highlightThreshold = 0.85): ScoreTier {
  if (score >= highlightThreshold) return 'high';
  if (score >= highlightThreshold - 0.15) return 'medium';
  return 'low';
}

export function formatLookupPath(key: string): string {
  const filePath = key.split('#')[0] ?? '';
  const parts = filePath.replace(/\.md$/, '').split('/');
  return parts.length <= 1 ? '' : parts.slice(0, -1).join(' > ');
}

export function formatLookupBlockIndicator(key: string): string {
  const [, ...headings] = key.split('#');
  // The top heading usually repeats the note title.
  if (headings[0] === formatLookupTitle(key)) headings.shift();
  return headings.join(' > ');
}

export function formatLookupTitle(key: string): string {
  const filename = key.split('#')[0]?.split('/').pop() ?? '';
  return filename.replace(/\.md$/, '') || 'Unknown';
}

export function dedupeLookupResults(results: ConnectionResult[], limit: number): ConnectionResult[] {
  const unique: ConnectionResult[] = [];
  const seen = new Set<string>();
  for (const result of results) {
    if (!result?.item?.key || seen.has(result.item.key)) continue;
    seen.add(result.item.key);
    unique.push(result);
    if (unique.length >= limit) break;
  }
  return unique;
}

/** Split a source or block key (`path.md#H1#H2`) into the file path and the deepest heading. */
export function splitNoteKey(key: string): { path: string; heading: string } {
  const [path = '', ...headings] = key.split('#');
  return { path, heading: headings[headings.length - 1] ?? '' };
}
