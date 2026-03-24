import { execFileSync } from 'node:child_process';

const TOKEN_SERVICE = 'sift-github';
const TOKEN_ACCOUNT = 'github-token';
const SECRET_LABEL = 'Sift GitHub Token';

export type TokenStorage = 'keychain' | 'secret-service' | 'credential-vault' | 'config';

export interface SecureTokenResult {
  token: string;
  storage: Exclude<TokenStorage, 'config'>;
}

function readMacToken(): string | undefined {
  const token = execFileSync(
    'security',
    ['find-generic-password', '-s', TOKEN_SERVICE, '-a', TOKEN_ACCOUNT, '-w'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  ).trim();

  return token || undefined;
}

function writeMacToken(token: string): boolean {
  execFileSync(
    'security',
    ['add-generic-password', '-s', TOKEN_SERVICE, '-a', TOKEN_ACCOUNT, '-w', token, '-U'],
    { stdio: ['ignore', 'ignore', 'ignore'] },
  );
  return true;
}

function readLinuxToken(): string | undefined {
  const token = execFileSync(
    'secret-tool',
    ['lookup', 'service', TOKEN_SERVICE, 'account', TOKEN_ACCOUNT],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  ).trim();

  return token || undefined;
}

function writeLinuxToken(token: string): boolean {
  execFileSync(
    'secret-tool',
    ['store', '--label', SECRET_LABEL, 'service', TOKEN_SERVICE, 'account', TOKEN_ACCOUNT],
    {
      encoding: 'utf8',
      input: token,
      stdio: ['pipe', 'ignore', 'ignore'],
    },
  );
  return true;
}

function runWindowsScript(script: string, extraEnv: Record<string, string> = {}): string {
  return execFileSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      windowsHide: true,
      env: {
        ...process.env,
        SIFT_TOKEN_SERVICE: TOKEN_SERVICE,
        SIFT_TOKEN_ACCOUNT: TOKEN_ACCOUNT,
        ...extraEnv,
      },
    },
  );
}

function readWindowsToken(): string | undefined {
  const token = runWindowsScript([
    '$vault = New-Object Windows.Security.Credentials.PasswordVault',
    '$credential = $vault.Retrieve($env:SIFT_TOKEN_SERVICE, $env:SIFT_TOKEN_ACCOUNT)',
    '$credential.RetrievePassword()',
    '[Console]::Out.Write($credential.Password)',
  ].join(';')).trim();

  return token || undefined;
}

function writeWindowsToken(token: string): boolean {
  runWindowsScript([
    '$vault = New-Object Windows.Security.Credentials.PasswordVault',
    'try {',
    '  $existing = $vault.Retrieve($env:SIFT_TOKEN_SERVICE, $env:SIFT_TOKEN_ACCOUNT)',
    '  if ($existing) { $vault.Remove($existing) }',
    '} catch {}',
    '$credential = New-Object Windows.Security.Credentials.PasswordCredential($env:SIFT_TOKEN_SERVICE, $env:SIFT_TOKEN_ACCOUNT, $env:SIFT_TOKEN)',
    '$vault.Add($credential)',
  ].join(' '), { SIFT_TOKEN: token });
  return true;
}

export function readTokenFromSecureStore(): SecureTokenResult | undefined {
  try {
    if (process.platform === 'darwin') {
      const token = readMacToken();
      return token ? { token, storage: 'keychain' } : undefined;
    }

    if (process.platform === 'linux') {
      const token = readLinuxToken();
      return token ? { token, storage: 'secret-service' } : undefined;
    }

    if (process.platform === 'win32') {
      const token = readWindowsToken();
      return token ? { token, storage: 'credential-vault' } : undefined;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function writeTokenToSecureStore(token: string): Exclude<TokenStorage, 'config'> | undefined {
  try {
    if (process.platform === 'darwin' && writeMacToken(token)) {
      return 'keychain';
    }

    if (process.platform === 'linux' && writeLinuxToken(token)) {
      return 'secret-service';
    }

    if (process.platform === 'win32' && writeWindowsToken(token)) {
      return 'credential-vault';
    }
  } catch {
    return undefined;
  }

  return undefined;
}
