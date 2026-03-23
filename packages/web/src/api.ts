import type { StatusResponse, ItemsResponse, SyncResult } from './types';

const BASE = '/api';

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export function fetchStatus(): Promise<StatusResponse> {
  return json('/status');
}

export function fetchItems(params: {
  layer?: number;
  type?: string;
  state?: string;
  sort?: string;
  order?: string;
  page?: number;
  limit?: number;
} = {}): Promise<ItemsResponse> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) qs.set(k, String(v));
  }
  return json(`/items?${qs}`);
}

export function fetchFeed(params: { page?: number; limit?: number } = {}): Promise<ItemsResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  return json(`/feed?${qs}`);
}

export function searchItems(query: string, params: { layer?: number; limit?: number } = {}): Promise<ItemsResponse> {
  const qs = new URLSearchParams({ q: query });
  if (params.layer) qs.set('layer', String(params.layer));
  if (params.limit) qs.set('limit', String(params.limit));
  return json(`/items/search?${qs}`);
}

export function triggerSync(): Promise<SyncResult> {
  return json('/sync', { method: 'POST' });
}

export function submitToken(token: string): Promise<{ success: boolean; username: string }> {
  return json('/setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}
