/**
 * @file content-rules.ts
 * @description Regex rules that strip text from note content before embedding.
 */

export interface ContentRulePreset {
  label: string;
  pattern: string;
}

export const CONTENT_RULE_PRESETS: ContentRulePreset[] = [
  { label: 'Aliased links', pattern: String.raw`\[\[[^\]\n|]+\|[^\]\n]+\]\]` },
  { label: 'URLs', pattern: String.raw`https?://[^\s)\]>]+` },
  { label: 'Image embeds', pattern: String.raw`!\[\[[^\]\n]+\]\]|!\[[^\]\n]*\]\([^)\n]*\)` },
];

const MAX_PATTERN_LENGTH = 300;
// ponytail: cheap backtracking guard only (pattern and input size caps); no execution timeout, add a worker if pathological patterns still hang
const MAX_INPUT_LENGTH = 200_000;

export interface ParsedContentRules {
  regexes: RegExp[];
  invalid: string[];
}

let lastRaw: string | null = null;
let lastParsed: ParsedContentRules = { regexes: [], invalid: [] };

/** One pattern per line; invalid lines are reported, never thrown. */
export function parseContentRules(raw: string | undefined): ParsedContentRules {
  const source = raw ?? '';
  if (source === lastRaw) return lastParsed;

  const regexes: RegExp[] = [];
  const invalid: string[] = [];
  for (const line of source.split('\n')) {
    const pattern = line.trim();
    if (!pattern) continue;
    if (pattern.length > MAX_PATTERN_LENGTH) {
      invalid.push(pattern);
      continue;
    }
    try {
      regexes.push(new RegExp(pattern, 'gm'));
    } catch {
      invalid.push(pattern);
    }
  }
  lastRaw = source;
  lastParsed = { regexes, invalid };
  return lastParsed;
}

export function applyContentRules(text: string, raw: string | undefined): string {
  if (text.length > MAX_INPUT_LENGTH) return text;
  const { regexes } = parseContentRules(raw);
  return regexes.reduce((acc, regex) => acc.replace(regex, ''), text);
}

export function normalizeContentRules(raw: string): string {
  return raw.split('\n').map((line) => line.trim()).filter(Boolean).join('\n');
}

/** Identity of the rules that actually affect embeddings; invalid lines are ignored. */
export function validContentRulesKey(raw: string | undefined): string {
  return parseContentRules(raw).regexes.map((regex) => regex.source).join('\n');
}
