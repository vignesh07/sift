import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readTokenFromSecureStore, writeTokenToSecureStore, type TokenStorage } from './token-store.js';

export interface SiftConfig {
  token?: string;
  username?: string;
  tokenStorage?: TokenStorage;
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'sift');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

interface StoredConfig {
  token?: string;
  username?: string;
  tokenStorage?: TokenStorage;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

function readStoredConfig(): StoredConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as StoredConfig;
  } catch {
    return {};
  }
}

function writeStoredConfig(config: StoredConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

function migrateLegacyToken(raw: StoredConfig): StoredConfig {
  if (!raw.token || readTokenFromSecureStore()) {
    return raw;
  }

  const secureStorage = writeTokenToSecureStore(raw.token);
  if (!secureStorage) {
    return raw;
  }

  const migrated: StoredConfig = {
    username: raw.username,
    tokenStorage: secureStorage,
  };
  writeStoredConfig(migrated);
  return migrated;
}

export function readConfig(): SiftConfig {
  const raw = migrateLegacyToken(readStoredConfig());
  const secureToken = readTokenFromSecureStore();

  return {
    username: raw.username,
    token: secureToken?.token ?? raw.token,
    tokenStorage: secureToken?.storage ?? (raw.token ? 'config' : raw.tokenStorage),
  };
}

export function writeConfig(config: SiftConfig): void {
  const stored: StoredConfig = {
    username: config.username,
    tokenStorage: config.tokenStorage,
  };

  if (config.tokenStorage === 'config' && config.token) {
    stored.token = config.token;
  }

  writeStoredConfig(stored);
}

export function storeToken(token: string): TokenStorage {
  const secureStorage = writeTokenToSecureStore(token);
  if (secureStorage) {
    return secureStorage;
  }

  return 'config';
}

export function getToken(): string | undefined {
  return readConfig().token;
}

export function getDbPath(): string {
  return path.join(CONFIG_DIR, 'sift.db');
}
