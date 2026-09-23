import React from 'react';
import { User, CheckCircle, ArrowRight, XCircle, Clock, Award } from 'lucide-react';

const COLUMNS = [
  { id: 'APPLIED', title: 'Applied', color: '#6366f1', badge: 'badge-info' },
  { id: 'SHORTLISTED', title: 'Shortlisted', color: '#8b5cf6', badge: 'badge-purple' },
  { id: 'MOCK_PENDING', title: 'Mock Pending', color: '#f59e0b', badge: 'badge-warning' },
  { id: 'SELECTED', title: 'Selected 🎉', color: '#10b981', badge: 'badge-success' },
  { id: 'REJECTED', title: 'Rejected', color: '#f43f5e', badge: 'badge-danger' },
];

export default function KanbanBoard({ applications, onStatusChange }) {
  const getCardsByStatus = (status) => {
    return (applications || []).filter((app) => app.status === status);
  };

  return (
    <div className="kanban-grid">
      {COLUMNS.map((col) => {
        const columnCards = getCardsByStatus(col.id);

        return (
          <div key={col.id} className="kanban-column">
            <div className="kanban-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: col.color,
                    display: 'inline-block',
                  }}
                />
                <span>{col.title}</span>
              </div>
              <span className={`badge ${col.badge}`} style={{ fontSize: '0.7rem' }}>
                {columnCards.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
              {columnCards.length === 0 ? (
                <div
                  style={{
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.8125rem',
                    fontStyle: 'italic',
                  }}
                >
                  No candidates
                </div>
              ) : (
                columnCards.map((app) => (
                  <div key={app.application_id} className="kanban-card">
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>
                          {app.full_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {app.email}
                        </div>
                      </div>
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                        {app.batch_code || 'BATCH-2026'}
                      </span>
                    </div>

                    {/* Stats pills */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                        CGPA: <strong>{Number(app.cgpa).toFixed(2)}</strong>
                      </span>
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                        Att: <strong>{Number(app.attendance_pct || 0).toFixed(0)}%</strong>
                      </span>
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                        Mock: <strong>{Number(app.avg_mock_pct || 0).toFixed(0)}%</strong>
                      </span>
                    </div>

                    {/* Skills */}
                    {app.student_skills && app.student_skills.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {app.student_skills.map((s, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '0.65rem',
                              padding: '0.1rem 0.35rem',
                              background: 'rgba(99, 102, 241, 0.15)',
                              color: '#a5b4fc',
                              borderRadius: 3,
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Quick Move Pipeline Buttons */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {col.id === 'APPLIED' && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', flex: 1 }}
                          onClick={() => onStatusChange(app.application_id, 'SHORTLISTED')}
                        >
                          Shortlist <ArrowRight size={12} />
                        </button>
                      )}
                      {col.id === 'SHORTLISTED' && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', flex: 1 }}
                          onClick={() => onStatusChange(app.application_id, 'MOCK_PENDING')}
                        >
                          Mock Round <ArrowRight size={12} />
                        </button>
                      )}
                      {col.id === 'MOCK_PENDING' && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', flex: 1, background: '#10b981' }}
                          onClick={() => onStatusChange(app.application_id, 'SELECTED')}
                        >
                          Select 🎉
                        </button>
                      )}
                      {col.id !== 'REJECTED' && col.id !== 'SELECTED' && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: '#fb7185' }}
                          onClick={() => onStatusChange(app.application_id, 'REJECTED')}
                          title="Reject candidate"
                        >
                          <XCircle size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
