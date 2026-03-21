// ============================================================
// src/pages/Settings.js
// ============================================================
import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

export default function Settings() {
  const { user } = useAuth();
  const [apiKeys,   setApiKeys]   = useState([]);
  const [webhooks,  setWebhooks]  = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newWHUrl,   setNewWHUrl]   = useState('');
  const [shownKey,   setShownKey]   = useState(null);

  useEffect(() => {
    api.get('/apikeys').then(r => setApiKeys(r.data.keys)).catch(console.error);
    api.get('/webhooks').then(r => setWebhooks(r.data.webhooks)).catch(console.error);
  }, []);

  const createKey = async () => {
    if (!newKeyName) return toast.error('Enter a key name');
    try {
      const res = await api.post('/apikeys', { name: newKeyName });
      setApiKeys(prev => [res.data, ...prev]);
      setShownKey(res.data.full_key);
      setNewKeyName('');
    } catch { toast.error('Failed to create key'); }
  };

  const deleteKey = async (id) => {
    if (!window.confirm('Delete this API key? This cannot be undone.')) return;
    try {
      await api.delete(`/apikeys/${id}`);
      setApiKeys(prev => prev.filter(k => k.id !== id));
      toast.success('Key deleted');
    } catch { toast.error('Failed'); }
  };

  const createWebhook = async () => {
    if (!newWHUrl) return toast.error('Enter a webhook URL');
    try {
      const res = await api.post('/webhooks', { url: newWHUrl, events: [] });
      setWebhooks(prev => [res.data, ...prev]);
      setNewWHUrl('');
      toast.success(`Webhook created! Secret: ${res.data.secret}`);
    } catch { toast.error('Failed to create webhook'); }
  };

  const deleteWebhook = async (id) => {
    await api.delete(`/webhooks/${id}`);
    setWebhooks(prev => prev.filter(w => w.id !== id));
    toast.success('Webhook deleted');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account, API keys, and integrations</p>
      </div>

      {/* Account info */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title"><div className="card-icon">👤</div>Account</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label className="form-label">Name</label>
            <input className="form-input" defaultValue={user?.name || ''} disabled />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input className="form-input" defaultValue={user?.email || ''} disabled />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <span className="badge badge-blue" style={{ fontSize: '0.78rem' }}>
            {user?.plan || 'Free'} Plan
          </span>
        </div>
      </div>

      {/* API Keys */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title"><div className="card-icon">🔑</div>API Keys</div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: 16 }}>
          Use these keys to integrate SecureVault into your own apps.
          Pass as the <code style={{ fontFamily: 'DM Mono', color: 'var(--accent)', fontSize: '0.8em' }}>X-API-Key</code> header.
        </p>

        {/* Create key */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input className="form-input" style={{ flex: 1 }}
            placeholder="Key name (e.g. Production App)"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createKey()} />
          <button className="btn btn-primary" onClick={createKey}>+ Create Key</button>
        </div>

        {/* Shown key (once) */}
        {shownKey && (
          <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--accent3)', marginBottom: 6 }}>
              ⚠️ Copy this key now — it won't be shown again!
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <code style={{ fontFamily: 'DM Mono', fontSize: '0.8rem', flex: 1, color: 'var(--accent3)', wordBreak: 'break-all' }}>
                {shownKey}
              </code>
              <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(shownKey); toast.success('Copied!'); }}>
                Copy
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setShownKey(null)}>✕</button>
            </div>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: '0.83rem' }}>No API keys yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {apiKeys.map(k => (
              <div key={k.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{k.name}</div>
                  <div style={{ fontFamily: 'DM Mono', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    {k.key_prefix}••••••••••••
                    {k.last_used && ` · Last used ${formatDistanceToNow(new Date(k.last_used), { addSuffix: true })}`}
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => deleteKey(k.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhooks */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title"><div className="card-icon">🔔</div>Webhooks</div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: 16 }}>
          Receive real-time events when packages are sent, downloaded, or expire.
          Verify signatures with the <code style={{ fontFamily: 'DM Mono', color: 'var(--accent)', fontSize: '0.8em' }}>X-SecureVault-Sig</code> header.
        </p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input className="form-input" style={{ flex: 1 }}
            placeholder="https://your-server.com/webhook"
            value={newWHUrl}
            onChange={e => setNewWHUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createWebhook()} />
          <button className="btn btn-primary" onClick={createWebhook}>+ Add</button>
        </div>

        {webhooks.length === 0 ? (
          <p style={{ color: 'var(--text-faint)', fontSize: '0.83rem' }}>No webhooks configured.</p>
        ) : webhooks.map(w => (
          <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'DM Mono', fontSize: '0.8rem', color: 'var(--accent)', wordBreak: 'break-all' }}>{w.url}</div>
            </div>
            <span className={`badge ${w.is_active ? 'badge-green' : 'badge-dim'}`}>
              {w.is_active ? 'Active' : 'Inactive'}
            </span>
            <button className="btn btn-danger btn-sm" onClick={() => deleteWebhook(w.id)}>Delete</button>
          </div>
        ))}
      </div>

      {/* Code samples */}
      <div className="card">
        <div className="card-title"><div className="card-icon">🛠️</div>API Quick Reference</div>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: 16 }}>
          Base URL: <code style={{ fontFamily: 'DM Mono', color: 'var(--accent)', fontSize: '0.85em' }}>{window.location.origin}/api</code>
        </p>
        <pre style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 18, fontFamily: 'DM Mono', fontSize: '0.78rem', color: 'var(--text-dim)', overflowX: 'auto', lineHeight: 1.8 }}>
{`# Send a package
curl -X POST /api/packages \\
  -H "X-API-Key: sv_live_..." \\
  -F "files=@report.pdf" \\
  -F "recipients=alice@corp.com" \\
  -F "expiry_days=7"

# List packages
curl /api/packages \\
  -H "X-API-Key: sv_live_..."

# Revoke a package
curl -X DELETE /api/packages/:id \\
  -H "X-API-Key: sv_live_..."`}
        </pre>
      </div>
    </div>
  );
}
