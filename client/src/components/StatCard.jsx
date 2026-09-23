import React from 'react';
import { Database } from 'lucide-react';

export default function StatCard({ title, value, subtext, icon: Icon, color = '#6366f1', onShowSql }) {
  return (
    <div className="glass-card stat-card">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            {title}
          </span>
          {onShowSql && (
            <button
              onClick={onShowSql}
              title="Inspect SQL query behind this metric"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#a5b4fc',
                display: 'inline-flex',
                alignItems: 'center',
                padding: 0,
              }}
            >
              <Database size={12} />
            </button>
          )}
        </div>
        <div className="stat-value">{value}</div>
        {subtext && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {subtext}
          </div>
        )}
      </div>

      {Icon && (
        <div
          className="stat-icon"
          style={{
            background: `${color}20`,
            color: color,
          }}
        >
          <Icon size={22} />
        </div>
      )}
    </div>
  );
}
