// ============================================================
// src/pages/Send.js — Upload + package creation
// ============================================================
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import './Send.css';

function fmtSize(b) {
  if (b < 1024) return b + 'B';
  if (b < 1048576) return (b / 1024).toFixed(1) + 'KB';
  if (b < 1073741824) return (b / 1048576).toFixed(1) + 'MB';
  return (b / 1073741824).toFixed(2) + 'GB';
}

export default function Send() {
  const navigate = useNavigate();
  const [files,    setFiles]    = useState([]);
  const [tags,     setTags]     = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [sending,  setSending]  = useState(false);
  const [progress, setProgress] = useState(0);

  const [form, setForm] = useState({
    subject:          '',
    message:          '',
    encryption_mode:  'aes256',
    passcode:         '',
    download_limit:   '',
    disable_download: false,
    watermark:        true,
    expiry_days:      '7',
    notify_download:  true,
  });

  // Dropzone
  const onDrop = useCallback((accepted) => {
    setFiles(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...accepted.filter(f => !names.has(f.name))];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 50,
    maxSize: 100 * 1024 * 1024 * 1024,
  });

  // Tag input
  const addTag = (val) => {
    const email = val.trim().toLowerCase();
    if (!email || tags.includes(email)) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Invalid email address');
      return;
    }
    setTags(prev => [...prev, email]);
    setTagInput('');
  };

  const handleTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  // Submit
  const handleSend = async () => {
    if (files.length === 0) return toast.error('Add at least one file');
    if (tags.length === 0)  return toast.error('Add at least one recipient');

    const data = new FormData();
    files.forEach(f => data.append('files', f));
    tags.forEach(t => data.append('recipients', t));
    Object.entries(form).forEach(([k, v]) => data.append(k, v));

    setSending(true);
    setProgress(0);

    try {
      const res = await api.post('/packages', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      const link = res.data.package.secure_link;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success(`Package sent! Link copied to clipboard.`);
      navigate(`/packages/${res.data.package.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send package');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Send Secure Package</h1>
        <p className="page-subtitle">Files are encrypted before leaving your browser</p>
      </div>

      <div className="send-grid">
        {/* Left column */}
        <div className="send-left">

          {/* Drop zone */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title"><div className="card-icon">📁</div>Attach Files</div>
            <div {...getRootProps()} className={`dropzone ${isDragActive ? 'dragover' : ''}`}>
              <input {...getInputProps()} />
              <div className="drop-icon">☁️</div>
              <h3>{isDragActive ? 'Drop files here…' : 'Drag & drop files'}</h3>
              <p>or <span className="drop-link">browse</span> — up to 100GB per package</p>
            </div>

            {files.length > 0 && (
              <div className="file-list">
                {files.map((f, i) => (
                  <div className="file-item" key={i}>
                    <div className="file-ext">{f.name.split('.').pop().toUpperCase().slice(0, 4)}</div>
                    <div className="file-info">
                      <div className="file-name">{f.name}</div>
                      <div className="file-size">{fmtSize(f.size)}</div>
                    </div>
                    <button className="file-rm" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recipients */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title"><div className="card-icon">👥</div>Recipients</div>
            <label className="form-label">Email Addresses</label>
            <div className="tag-input-wrap" onClick={() => document.getElementById('tagReal').focus()}>
              {tags.map(t => (
                <span className="tag" key={t}>
                  {t}
                  <button onClick={() => setTags(prev => prev.filter(x => x !== t))}>×</button>
                </span>
              ))}
              <input
                id="tagReal" className="tag-real" type="email"
                placeholder={tags.length ? '' : 'Enter email & press Enter…'}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                onBlur={() => tagInput && addTag(tagInput)}
              />
            </div>
            <div className="form-group" style={{ marginTop: 16 }}>
              <label className="form-label">Subject (optional)</label>
              <input className="form-input" type="text"
                placeholder="e.g. Q4 Financial Reports"
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Message (optional)</label>
              <textarea className="form-textarea"
                placeholder="A note to your recipients…"
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="send-right">

          {/* Security */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title"><div className="card-icon">🛡️</div>Security</div>
            <div className="form-group">
              <label className="form-label">Encryption Mode</label>
              <select className="form-select"
                value={form.encryption_mode}
                onChange={e => setForm({ ...form, encryption_mode: e.target.value })}>
                <option value="aes256">AES-256 (Default)</option>
                <option value="pgp">PGP Keys</option>
                <option value="zero_knowledge">Zero Knowledge</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Passcode (optional)</label>
              <input className="form-input" type="password"
                placeholder="Recipients will need this code"
                value={form.passcode}
                onChange={e => setForm({ ...form, passcode: e.target.value })} />
            </div>
            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-label">Disable Download</div>
                <div className="toggle-sub">View-only mode</div>
              </div>
              <button className={`toggle ${form.disable_download ? 'on' : ''}`}
                onClick={() => setForm({ ...form, disable_download: !form.disable_download })} />
            </div>
            <div className="toggle-row">
              <div className="toggle-info">
                <div className="toggle-label">Watermark Documents</div>
                <div className="toggle-sub">Stamps recipient email on docs</div>
              </div>
              <button className={`toggle ${form.watermark ? 'on' : ''}`}
                onClick={() => setForm({ ...form, watermark: !form.watermark })} />
            </div>
          </div>

          {/* Access control */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title"><div className="card-icon">⏱️</div>Access Control</div>
            <div className="form-group">
              <label className="form-label">Expiry</label>
              <select className="form-select"
                value={form.expiry_days}
                onChange={e => setForm({ ...form, expiry_days: e.target.value })}>
                <option value="1">24 hours</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="never">Never</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Download Limit (optional)</label>
              <input className="form-input" type="number" min="1"
                placeholder="Unlimited"
                value={form.download_limit}
                onChange={e => setForm({ ...form, download_limit: e.target.value })} />
            </div>
          </div>

          {/* Send button */}
          <div className="card send-action-card">
            {sending && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 6 }}>
                  <span>Encrypting & uploading…</span><span>{progress}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            <button className="btn btn-primary btn-full" onClick={handleSend} disabled={sending}>
              {sending ? `⏳ Sending… ${progress}%` : '🚀 Encrypt & Send'}
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textAlign: 'center', marginTop: 10 }}>
              🔒 Files are AES-256 encrypted. Recipients receive a secure expiring link.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
