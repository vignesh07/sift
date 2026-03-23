import { useState } from 'react';
import { submitToken } from '../api';
import { useQueryClient } from '@tanstack/react-query';

export default function SetupScreen() {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await submitToken(token);
      queryClient.invalidateQueries({ queryKey: ['status'] });
    } catch (err: any) {
      setError(err.message ?? 'Failed to validate token');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F7F4' }}>
      <div className="w-full max-w-md px-6">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#1B1B18', fontFamily: 'Inter, system-ui, sans-serif' }}>
            Sift
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#6B6B63' }}>
            Your GitHub inbox, organized by signal.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-xs font-medium uppercase tracking-wider mb-2" style={{ color: '#6B6B63' }}>
            GitHub Personal Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_..."
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors"
            style={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E5E4E0',
              color: '#1B1B18',
              fontFamily: '"Geist Mono", ui-monospace, monospace',
            }}
            autoFocus
          />
          <p className="mt-2 text-xs" style={{ color: '#9F9F97' }}>
            Required scopes: <code className="font-medium">notifications</code>, <code className="font-medium">read:user</code>, <code className="font-medium">repo</code>
          </p>

          {error && (
            <p className="mt-3 text-sm font-medium" style={{ color: '#C2553A' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            className="mt-5 w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-40"
            style={{ backgroundColor: '#1B1B18', color: '#F8F7F4' }}
          >
            {loading ? 'Validating...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
