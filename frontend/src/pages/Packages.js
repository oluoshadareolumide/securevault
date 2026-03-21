// ============================================================
// src/pages/Packages.js
// ============================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function Packages() {
  const [packages, setPackages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [total,    setTotal]    = useState(0);

  const load = (p = 1) => {
    setLoading(true);
    api.get(`/packages?page=${p}&limit=15`)
      .then(r => { setPackages(r.data.packages); setTotal(r.data.total); setPage(p); })
      .catch(() => toast.error('Failed to load packages'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const revoke = async (id) => {
    if (!window.confirm('Revoke this package? Recipients will lose access.')) return;
    try {
      await api.delete(`/packages/${id}`);
      toast.success('Package revoked');
      load(page);
    } catch { toast.error('Failed to revoke'); }
  };

  const copyLink = (id) => {
    const link = `${window.location.origin}/receive/${id}`;
    navigator.clipboard.writeText(link);
    toast.success('Link copied!');
  };

  const statusBadge = (pkg) => {
    if (!pkg.is_active) return <span className="badge badge-dim">Revoked</span>;
    if (pkg.expires_at && new Date(pkg.expires_at) < new Date())
      return <span className="badge badge-red">Expired</span>;
    return <span className="badge badge-green">Active</span>;
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Packages</h1>
          <p className="page-subtitle">{total} total packages</p>
        </div>
        <Link to="/send" className="btn btn-primary">🚀 New Package</Link>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div>
        ) : packages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No packages yet</h3>
            <p>Send your first encrypted package</p>
            <Link to="/send" className="btn btn-primary">Send Files</Link>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>Recipients</th>
                    <th>Files</th>
                    <th>Downloads</th>
                    <th>Status</th>
                    <th>Sent</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map(pkg => (
                    <tr key={pkg.id}>
                      <td>
                        <Link to={`/packages/${pkg.id}`} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>
                          {pkg.subject || 'Untitled Package'}
                        </Link>
                      </td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        {(pkg.recipients || []).slice(0,2).join(', ')}
                        {(pkg.recipients || []).length > 2 && ` +${pkg.recipients.length-2} more`}
                      </td>
                      <td>{pkg.file_count}</td>
                      <td>{pkg.download_count}</td>
                      <td>{statusBadge(pkg)}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                        {formatDistanceToNow(new Date(pkg.created_at), { addSuffix: true })}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => copyLink(pkg.id)}>🔗</button>
                          {pkg.is_active && (
                            <button className="btn btn-danger btn-sm" onClick={() => revoke(pkg.id)}>✕</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 15 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, paddingTop: 16 }}>
                <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => load(page-1)}>← Prev</button>
                <span style={{ alignSelf: 'center', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                  Page {page} of {Math.ceil(total/15)}
                </span>
                <button className="btn btn-ghost btn-sm" disabled={page >= Math.ceil(total/15)} onClick={() => load(page+1)}>Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
