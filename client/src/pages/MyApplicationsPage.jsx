import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { CheckCircle2, Clock, AlertCircle, Briefcase, ArrowRight, Building } from 'lucide-react';

const STAGES = [
  { key: 'APPLIED', label: 'Applied' },
  { key: 'SHORTLISTED', label: 'Shortlisted' },
  { key: 'MOCK_PENDING', label: 'Technical Mock' },
  { key: 'SELECTED', label: 'Selected 🎉' }
];

export default function MyApplicationsPage({ onNavigateToJobs }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadApps() {
      try {
        const data = await api.getMyApplications();
        setApplications(data.applications || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadApps();
  }, []);

  const getStageIndex = (status) => {
    if (status === 'REJECTED') return -1;
    return STAGES.findIndex(s => s.key === status);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>My Application Pipeline</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Real-time placement pipeline tracking driven by HR Kanban board stage advances.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Briefcase size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>No active applications yet</h3>
          <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem' }}>Explore campus drives where you are eligible and submit your application.</p>
          <button className="btn btn-primary" onClick={onNavigateToJobs} style={{ marginTop: '1rem' }}>
            Browse Eligible Drives <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {applications.map((app) => {
            const stageIdx = getStageIndex(app.status);
            const isRejected = app.status === 'REJECTED';

            return (
              <div key={app.application_id} className="glass-card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Building size={16} color="var(--primary)" />
                      <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>{app.company_name}</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{app.job_profile} • {app.package_lpa} LPA</p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Applied on {new Date(app.applied_at).toLocaleDateString()}
                    </span>
                    <span className={`badge ${
                      app.status === 'SELECTED' ? 'badge-success' :
                      app.status === 'SHORTLISTED' ? 'badge-purple' :
                      app.status === 'MOCK_PENDING' ? 'badge-warning' :
                      app.status === 'REJECTED' ? 'badge-danger' : 'badge-info'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                </div>

                {/* Visual Pipeline Bar */}
                <div style={{ background: 'rgba(0, 0, 0, 0.25)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1rem' }}>
                  {isRejected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fb7185' }}>
                      <AlertCircle size={20} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Application Not Progressed</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Drive closed or profile did not match candidate shortlist parameters.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', position: 'relative' }}>
                      {STAGES.map((stg, idx) => {
                        const isCompleted = stageIdx >= idx;
                        const isCurrent = stageIdx === idx;

                        return (
                          <div key={stg.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: isCompleted ? (stg.key === 'SELECTED' ? '#10b981' : '#6366f1') : '#1f2937',
                                border: isCurrent ? '2px solid #ffffff' : '1px solid var(--border-color)',
                                color: isCompleted ? '#ffffff' : 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                zIndex: 2
                              }}
                            >
                              {isCompleted ? '✓' : idx + 1}
                            </div>
                            <span style={{
                              fontSize: '0.75rem',
                              marginTop: '0.5rem',
                              fontWeight: isCurrent ? 700 : 500,
                              color: isCompleted ? '#ffffff' : 'var(--text-muted)'
                            }}>
                              {stg.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
