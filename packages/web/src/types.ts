export interface Item {
  id: string;
  type: 'pr' | 'issue';
  state: 'open' | 'closed' | 'merged';
  title: string;
  url: string;
  number: number;
  repo_owner: string;
  repo_name: string;
  author_login: string;
  author_avatar: string | null;
  created_at: string;
  updated_at: string;
  comment_count: number;
  reaction_count: number;
  participant_count: number;
  labels: string; // JSON array
  notification_reason: string | null;
  is_read: number;
  layer: 1 | 2 | 3 | 4 | 5;
  layer_reasons: string; // JSON array
  is_draft: number | null;
  review_decision: string | null;
  additions: number | null;
  deletions: number | null;
}

export interface StatusResponse {
  needsToken: boolean;
  user: string | null;
  lastSync: string | null;
  syncInProgress: boolean;
  itemCounts: Record<number, number>;
}

export interface ItemsResponse {
  items: Item[];
  total: number;
}

export interface SyncResult {
  itemsSynced: number;
  socialRefreshed: boolean;
  errors: string[];
}

export interface SetupResponse {
  success: boolean;
  username: string;
  tokenStorage: 'keychain' | 'secret-service' | 'credential-vault' | 'config';
  scopesVerified: boolean;
}
