import React from 'react';
import { X, Database, Copy, Check } from 'lucide-react';

export default function SqlModal({ isOpen, onClose, title, sql, explanation, params }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(139, 92, 246, 0.2)',
              color: '#c4b5fd', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Database size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>{title || 'Relational SQL Query'}</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Powered by PostgreSQL 16 on Neon
              </p>
            </div>
          </div>
          <button className="btn btn-outline btn-sm" onClick={onClose} style={{ padding: '0.25rem 0.5rem' }}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {explanation && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              fontSize: '0.8125rem',
              color: '#e0e7ff',
              lineHeight: 1.5
            }}>
              <strong>Relational Logic:</strong> {explanation}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Parameterized SQL
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleCopy}
                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
              >
                {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy SQL'}
              </button>
            </div>
            <pre className="sql-code-block">{sql}</pre>
          </div>

          {params && (
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Bound Parameters
              </span>
              <div style={{
                marginTop: '0.25rem',
                padding: '0.5rem 0.75rem',
                background: '#090d16',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                color: '#a5b4fc'
              }}>
                {JSON.stringify(params, null, 2)}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary btn-sm" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
