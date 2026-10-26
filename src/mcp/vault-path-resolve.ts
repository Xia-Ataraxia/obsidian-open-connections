import { existsSync } from 'fs';
import { realpath } from 'fs/promises';
import { isAbsolute, relative, resolve, sep } from 'path';

import { rejectUnsafeVaultPath, UnsafeVaultPathError } from './vault-path-guard';

// Standalone MCP server only: the plugin build reads through the Vault API instead of fs.
export async function resolveVaultNotePath(
  vaultPath: string,
  notePath: string,
): Promise<string | null> {
  rejectUnsafeVaultPath(notePath);
  const vaultReal = await realpath(vaultPath);
  const candidate = resolve(vaultReal, notePath);
  if (!existsSync(candidate)) return null;
  const candidateReal = await realpath(candidate);
  if (!isUnderDirectory(vaultReal, candidateReal)) {
    throw new UnsafeVaultPathError('symlink_escape');
  }
  return candidateReal;
}

function isUnderDirectory(parent: string, child: string): boolean {
  const rel = relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith(sep) && !isAbsolute(rel));
}
