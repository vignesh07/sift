import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export interface SiftConfig {
  token?: string;
  username?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'sift');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function readConfig(): SiftConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as SiftConfig;
  } catch {
    return {};
  }
}

export function writeConfig(config: SiftConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

export function getToken(): string | undefined {
  return readConfig().token;
}

export function getDbPath(): string {
  return path.join(CONFIG_DIR, 'sift.db');
}
