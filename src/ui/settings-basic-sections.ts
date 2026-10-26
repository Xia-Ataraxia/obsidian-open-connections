import type { SettingGroupItem } from 'obsidian';

export function sourceDefinitions(): SettingGroupItem[] {
  return [
    {
      name: 'Minimum characters',
      desc: 'Skip files shorter than this character count',
      control: { type: 'number', key: 'smart_sources.min_chars', defaultValue: 200, min: 0 },
    },
    {
      name: 'File exclusions',
      desc: 'Comma-separated file name patterns to exclude',
      control: { type: 'text', key: 'smart_sources.file_exclusions', defaultValue: '', placeholder: 'Untitled, templates' },
    },
  ];
}

export function excludedHeadingsDefinition(): SettingGroupItem {
  return {
    name: 'Excluded headings',
    desc: 'Comma-separated heading patterns to skip',
    control: { type: 'text', key: 'smart_sources.excluded_headings', defaultValue: '', placeholder: '#Draft, #ignore' },
  };
}

export function blockDefinitions(): SettingGroupItem[] {
  return [
    {
      name: 'Enable block-level embedding',
      desc: 'Embed individual sections for more granular connections',
      control: { type: 'toggle', key: 'smart_blocks.embed_blocks', defaultValue: true },
    },
    {
      name: 'Minimum block characters',
      desc: 'Skip blocks shorter than this character count',
      control: { type: 'number', key: 'smart_blocks.min_chars', defaultValue: 200, min: 0 },
    },
    {
      name: 'Block heading depth',
      desc: 'Split blocks at heading levels up to this depth (1=h1 only, 6=all headings). H4+ headings merge into their parent block at the default of 3.',
      control: { type: 'slider', key: 'smart_blocks.block_heading_depth', defaultValue: 3, min: 1, max: 6, step: 1 },
    },
    {
      name: 'Re-embed minimum change',
      desc: 'Skip re-embedding when content change is smaller than this (chars). Saves API costs on trivial edits.',
      control: { type: 'slider', key: 'smart_blocks.re_embed_min_change', defaultValue: 200, min: 0, max: 500, step: 10 },
    },
    {
      name: 'Save frequency',
      desc: 'Save progress every n batches. Lower = safer on crash, higher = less disk i/o',
      control: { type: 'slider', key: 'embed_save_interval', defaultValue: 5, min: 1, max: 50, step: 1 },
    },
    {
      name: 'Embedding concurrency',
      desc: 'Number of batches sent to the API simultaneously. Lower if hitting rate limits.',
      control: { type: 'slider', key: 'embed_concurrency', defaultValue: 5, min: 1, max: 10, step: 1 },
    },
    {
      name: 'Discovery chunk size',
      desc: 'Files processed per chunk during vault discovery. Lower = smoother UI, higher = faster.',
      control: { type: 'slider', key: 'discovery_chunk_size', defaultValue: 1000, min: 100, max: 5000, step: 100 },
    },
  ];
}

export function viewDefinitions(): SettingGroupItem[] {
  return [
    {
      name: 'Highlight threshold',
      desc: 'Results above this similarity score are highlighted with your accent color',
      control: { type: 'slider', key: 'smart_view_filter.highlight_threshold', defaultValue: 0.8, min: 0.5, max: 0.95, step: 0.05 },
    },
  ];
}
