import { execFileSync } from 'node:child_process';

const TOKEN_SERVICE = 'sift-github';
const TOKEN_ACCOUNT = 'github-token';

export type TokenStorage = 'keychain' | 'config';

function supportsKeychain(): boolean {
  return process.platform === 'darwin';
}

export function readTokenFromSecureStore(): string | undefined {
  if (!supportsKeychain()) {
    return undefined;
  }

  try {
    const token = execFileSync(
      'security',
      ['find-generic-password', '-s', TOKEN_SERVICE, '-a', TOKEN_ACCOUNT, '-w'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim();
    return token || undefined;
  } catch {
    return undefined;
  }
}

export function writeTokenToSecureStore(token: string): boolean {
  if (!supportsKeychain()) {
    return false;
  }

  try {
    execFileSync(
      'security',
      ['add-generic-password', '-s', TOKEN_SERVICE, '-a', TOKEN_ACCOUNT, '-w', token, '-U'],
      { stdio: ['ignore', 'ignore', 'ignore'] },
    );
    return true;
  } catch {
    return false;
  }
}
