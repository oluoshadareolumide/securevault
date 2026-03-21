// ============================================================
// src/pages/Dashboard.js
// ============================================================
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const [packages, setPackages] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get('/packages?limit=5')
      .then(r => setPackages(r.data.packages || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalFiles      = packages.reduce((s, p) => s + parseInt(p.file_count || 0), 0);
  const totalDownloads  = packages.reduce((s, p) => s + parseInt(p.download_count || 0), 0);
  const activePackages  = packages.filter(p => p.is_active).length;

  const statusBadge = (pkg) => {
    if (!pkg.is_active) return <span className="badge badge-dim">Revoked</span>;
    if (pkg.expires_at && new Date(pkg.expires_at) < new Date())
      return <span className="badge badge-red">Expired</span>;
    return <span className="badge badge-green">Active</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your secure file transfers</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">📦 Total Packages</div>
          <div className="stat-value">{packages.length}</div>
          <div className="stat-delta">Last 20 packages</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">✅ Active</div>
          <div className="stat-value">{activePackages}</div>
          <div className="stat-delta">Currently accessible</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📁 Files Sent</div>
          <div className="stat-value">{totalFiles}</div>
          <div className="stat-delta">Across all packages</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📥 Downloads</div>
          <div className="stat-value">{totalDownloads}</div>
          <div className="stat-delta">Total downloads</div>
        </div>
      </div>

      {/* Quick action */}
      <div style={{ marginBottom: 28 }}>
        <Link to="/send" className="btn btn-primary">
          🚀 Send Secure Package
        </Link>
      </div>

      {/* Recent packages */}
      <div className="card">
        <div className="card-title">
          <div className="card-icon">📋</div>
          Recent Packages
          <Link to="/packages" style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--accent)', textDecoration: 'none' }}>
            View all →
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading…</div>
        ) : packages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>No packages yet</h3>
            <p>Send your first encrypted package</p>
            <Link to="/send" className="btn btn-primary">Send Files</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Recipients</th>
                  <th>Files</th>
                  <th>Downloads</th>
                  <th>Status</th>
                  <th>Sent</th>
                </tr>
              </thead>
              <tbody>
                {packages.map(pkg => (
                  <tr key={pkg.id}>
                    <td>
                      <Link to={`/packages/${pkg.id}`}
                        style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                        {pkg.subject || 'Untitled Package'}
                      </Link>
                    </td>
                    <td style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      {(pkg.recipients || []).slice(0, 2).join(', ')}
                      {(pkg.recipients || []).length > 2 && ` +${pkg.recipients.length - 2}`}
                    </td>
                    <td>{pkg.file_count}</td>
                    <td>{pkg.download_count}</td>
                    <td>{statusBadge(pkg)}</td>
                    <td style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                      {formatDistanceToNow(new Date(pkg.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
