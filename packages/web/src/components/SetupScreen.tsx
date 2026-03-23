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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F7F4' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 24px' }}>
        <div style={{ marginBottom: 48 }}>
          <h1 style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 36,
            fontStyle: 'italic',
            letterSpacing: '-0.02em',
            color: '#1B1B18',
            margin: 0,
          }}>
            Sift
          </h1>
          <p style={{
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: 13,
            lineHeight: '18px',
            color: '#9F9F97',
            marginTop: 8,
          }}>
            Your GitHub inbox, organized by signal.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{
            display: 'block',
            fontFamily: '"Geist Mono", monospace',
            fontSize: 11,
            letterSpacing: '0.05em',
            textTransform: 'uppercase' as const,
            color: '#9F9F97',
            marginBottom: 8,
          }}>
            Personal Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_..."
            autoFocus
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #E5E4E0',
              backgroundColor: '#FFFFFF',
              fontFamily: '"Geist Mono", monospace',
              fontSize: 13,
              color: '#1B1B18',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <p style={{
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: 11,
            color: '#B5B5AD',
            marginTop: 8,
          }}>
            Required scopes: notifications, read:user, repo
          </p>

          {error && (
            <p style={{ fontFamily: '"Inter", system-ui, sans-serif', fontSize: 12, fontWeight: 500, color: '#C2553A', marginTop: 12 }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !token.trim()}
            style={{
              marginTop: 20,
              width: '100%',
              padding: '10px 0',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#1B1B18',
              color: '#F8F7F4',
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: 13,
              fontWeight: 500,
              cursor: loading || !token.trim() ? 'default' : 'pointer',
              opacity: loading || !token.trim() ? 0.4 : 1,
            }}
          >
            {loading ? 'Validating...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
