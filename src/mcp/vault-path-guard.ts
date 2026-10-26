import { isAbsolute } from 'path';

export class UnsafeVaultPathError extends Error {
  constructor(reason: string) {
    super(`Unsafe vault path: ${reason}`);
    this.name = 'UnsafeVaultPathError';
  }
}

export function rejectUnsafeVaultPath(notePath: string): void {
  if (!notePath || notePath.includes('\0')) throw new UnsafeVaultPathError('empty_or_nul');
  if (isAbsolute(notePath)) throw new UnsafeVaultPathError('absolute_path');
  for (const variant of encodedPathVariants(notePath)) rejectTraversalSegments(variant);
}

function encodedPathVariants(notePath: string): string[] {
  const variants = [notePath];
  let current = notePath;
  for (let i = 0; i < 3; i++) {
    const decoded = decodePath(current);
    if (decoded === current) break;
    variants.push(decoded);
    current = decoded;
  }
  return variants;
}

function decodePath(notePath: string): string {
  try {
    return decodeURIComponent(notePath);
  } catch {
    throw new UnsafeVaultPathError('malformed_encoding');
  }
}

function rejectTraversalSegments(notePath: string): void {
  const normalized = notePath.replace(/\\/g, '/');
  if (normalized.split('/').some((segment) => segment === '..')) {
    throw new UnsafeVaultPathError('traversal_segment');
  }
}

