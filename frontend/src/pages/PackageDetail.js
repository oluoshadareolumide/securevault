// ============================================================
// src/pages/PackageDetail.js
// ============================================================
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow, format } from 'date-fns';

export default function PackageDetail() {
  const { id } = useParams();
  const [pkg,      setPkg]      = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/packages/${id}`),
      api.get(`/packages/${id}/activity`)
    ]).then(([pkgRes, actRes]) => {
      setPkg(pkgRes.data);
      setActivity(actRes.data.activity || []);
    }).catch(() => toast.error('Failed to load package'))
      .finally(() => setLoading(false));
  }, [id]);

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/receive/${id}`);
    toast.success('Link copied!');
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div>;
  if (!pkg) return <div style={{ padding: 40 }}>Package not found. <Link to="/packages" style={{color:'var(--accent)'}}>← Back</Link></div>;

  const eventIcon = (type) => ({
    'package.created': '📤', 'file.downloaded': '📥',
    'package.viewed': '👁️', 'package.revoked': '🚫'
  }[type] || '📋');

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Link to="/packages" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.85rem' }}>← Packages</Link>
        </div>
        <h1 className="page-title">{pkg.subject || 'Untitled Package'}</h1>
        <p className="page-subtitle">
          {pkg.is_active ? '✅ Active' : '🚫 Revoked'} ·{' '}
          {pkg.expires_at ? `Expires ${format(new Date(pkg.expires_at), 'MMM d, yyyy')}` : 'Never expires'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
        <div>
          {/* Files */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title"><div className="card-icon">📁</div>Files ({(pkg.files||[]).length})</div>
            {(pkg.files || []).map(file => (
              <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 32, height: 32, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontSize: '0.6rem', fontFamily: 'DM Mono', fontWeight: 600 }}>
                  {file.original_name.split('.').pop().toUpperCase().slice(0,4)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{file.original_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    {file.size_bytes ? (file.size_bytes / 1048576).toFixed(1) + ' MB' : '?'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Activity */}
          <div className="card">
            <div className="card-title"><div className="card-icon">📋</div>Audit Trail</div>
            {activity.length === 0 ? (
              <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>No activity yet.</p>
            ) : activity.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>{eventIcon(a.event_type)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem' }}>
                    <strong>{a.event_type}</strong>
                    {a.actor_email && <> · {a.actor_email}</>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    {a.ip_address && `IP: ${a.ip_address} · `}
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title"><div className="card-icon">📊</div>Stats</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['Views', pkg.view_count||0], ['Downloads', pkg.download_count||0]].map(([l,v]) => (
                <div key={l} style={{ background: 'var(--surface2)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.4rem' }}>{v}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-full" style={{ marginTop: 14 }} onClick={copyLink}>
              🔗 Copy Secure Link
            </button>
          </div>

          <div className="card">
            <div className="card-title"><div className="card-icon">🔒</div>Settings</div>
            {[
              ['Encryption', pkg.encryption_mode?.toUpperCase()],
              ['Passcode', pkg.requires_passcode ? 'Required' : 'None'],
              ['Downloads', pkg.disable_download ? 'Disabled' : 'Enabled'],
              ['Watermark', pkg.watermark ? 'On' : 'Off'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.84rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
