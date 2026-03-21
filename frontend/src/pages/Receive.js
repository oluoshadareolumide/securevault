// ============================================================
// src/pages/Receive.js — Public page for recipients
// ============================================================
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

function fmtSize(b) {
  if (!b) return '?';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + ' MB';
  return (b / 1073741824).toFixed(2) + ' GB';
}

export default function Receive() {
  const { id } = useParams();
  const [pkg,        setPkg]        = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [passcode,   setPasscode]   = useState('');
  const [verified,   setVerified]   = useState(false);
  const [verifying,  setVerifying]  = useState(false);
  const [email,      setEmail]      = useState('');

  useEffect(() => {
    api.get(`/packages/${id}`)
      .then(r => {
        setPkg(r.data);
        if (!r.data.requires_passcode) setVerified(true);
      })
      .catch(err => setError(err.response?.data?.error || 'Package not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const verifyPasscode = async () => {
    setVerifying(true);
    try {
      await api.post(`/packages/${id}/verify`, { passcode });
      setVerified(true);
      toast.success('Access granted');
    } catch {
      toast.error('Incorrect passcode');
    } finally {
      setVerifying(false);
    }
  };

  const downloadFile = (fileId, fileName) => {
    if (!email) return toast.error('Enter your email address first');
    const url = `${process.env.REACT_APP_API_URL || '/api'}/files/${fileId}/download?email=${encodeURIComponent(email)}`;
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Downloading ${fileName}`);
  };

  // ── States ──
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontFamily: 'Syne', fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>Package Unavailable</h2>
        <p style={{ color: 'var(--text-dim)', marginBottom: 24 }}>{error}</p>
        <a href="/" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.9rem' }}>← Go Home</a>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: 'DM Sans, sans-serif', color: 'var(--text)'
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '1.4rem', marginBottom: 4 }}>
            🔐 Secure<span style={{ color: 'var(--accent)' }}>Vault</span>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>End-to-End Encrypted File Transfer</p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden' }}>

          {/* Package info */}
          <div style={{ padding: '28px 28px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                📦
              </div>
              <div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1rem' }}>
                  {pkg.subject || 'Secure Package'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  From: {pkg.sender_name || pkg.sender_email || 'SecureVault User'}
                </div>
              </div>
            </div>

            {pkg.message && (
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: 12 }}>
                "{pkg.message}"
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.1rem' }}>{(pkg.files || []).length}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>Files</div>
              </div>
              <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.1rem' }}>{pkg.encryption_mode?.toUpperCase()}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>Encryption</div>
              </div>
              <div style={{ flex: 1, background: 'var(--surface2)', borderRadius: 10, padding: '10px 14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1rem' }}>
                  {pkg.expires_at ? new Date(pkg.expires_at).toLocaleDateString() : '∞'}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>Expires</div>
              </div>
            </div>
          </div>

          {/* Passcode gate */}
          {!verified && pkg.requires_passcode && (
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 12 }}>🔒 Enter Passcode</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input" type="password"
                  placeholder="Enter passcode…"
                  value={passcode}
                  onChange={e => setPasscode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && verifyPasscode()}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" onClick={verifyPasscode} disabled={verifying}>
                  {verifying ? '…' : '→'}
                </button>
              </div>
            </div>
          )}

          {/* File list */}
          {verified && (
            <div style={{ padding: '24px 28px' }}>
              {/* Email input for audit */}
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Your Email (for access log)</label>
                <input className="form-input" type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(pkg.files || []).map(file => (
                  <div key={file.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '12px 14px'
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--accent)', fontFamily: 'DM Mono', fontSize: '0.62rem', fontWeight: 600
                    }}>
                      {file.original_name.split('.').pop().toUpperCase().slice(0,4)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {file.original_name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{fmtSize(file.size_bytes)}</div>
                    </div>
                    {!pkg.disable_download && (
                      <button className="btn btn-primary btn-sm"
                        onClick={() => downloadFile(file.id, file.original_name)}>
                        📥 Download
                      </button>
                    )}
                    {pkg.disable_download && (
                      <span className="badge badge-yellow">View only</span>
                    )}
                  </div>
                ))}
              </div>

              <p style={{ fontSize: '0.72rem', color: 'var(--text-faint)', textAlign: 'center', marginTop: 16 }}>
                🔒 Your download activity is logged for security purposes.
              </p>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 16 }}>
          Powered by SecureVault · End-to-End Encrypted · SOC 2 Type II
        </p>
      </div>
    </div>
  );
}
