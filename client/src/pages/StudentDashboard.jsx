import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import StatCard from '../components/StatCard';
import SqlModal from '../components/SqlModal';
import {
  Award,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Database,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Clock
} from 'lucide-react';

export default function StudentDashboard({ onNavigate, onSelectJob }) {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [selectedSqlData, setSelectedSqlData] = useState({ title: '', sql: '', explanation: '' });

  useEffect(() => {
    async function loadData() {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          api.getJobs(),
          api.getMyApplications()
        ]);
        setJobs(jobsRes.jobs || []);
        setApplications(appsRes.applications || []);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    const refreshOnFocus = () => loadData();
    loadData();
    const refreshTimer = window.setInterval(loadData, 5000);
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, []);

  const attPct = parseFloat(user?.attendance_pct || 0);
  const mockPct = parseFloat(user?.avg_mock_pct || 0);

  const isAttLow = attPct < 75;
  const isMockLow = mockPct < 60;

  const eligibleJobs = jobs.filter(j => j.is_eligible);

  const handleShowEligibilitySql = () => {
    setSelectedSqlData({
      title: 'Automated 5-Factor Eligibility Engine',
      sql: `SELECT u.user_id, u.full_name,
  (u.cgpa >= j.min_cgpa)                     AS cgpa_ok,
  (u.passout_year = j.eligible_passout_year) AS year_ok,
  (s.attendance_pct >= j.min_attendance)     AS attendance_ok,
  (s.avg_mock_pct  >= j.min_mock_score)      AS mock_ok,
  NOT EXISTS (
    SELECT 1 FROM job_skills js
    WHERE js.job_id = j.job_id
      AND js.skill_id NOT IN (SELECT ss.skill_id FROM student_skills ss
                              WHERE ss.student_id = u.user_id)
  )                                          AS skills_ok
FROM users u
JOIN student_stats s ON s.user_id = u.user_id
CROSS JOIN job_requirements j
WHERE j.job_id = $1 AND u.user_id = $2;`,
      explanation: 'Every student eligibility decision is executed via relational SQL: joining candidate stats with company criteria and checking student_skills subsets via correlated NOT EXISTS.'
    });
    setSqlModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Banner / Welcome */}
      <div className="glass-card" style={{ padding: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-purple">{user?.batch_code || 'BATCH-2026-FS'}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Class of {user?.passout_year || 2026}</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            Welcome back, {user?.full_name}!
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Live placement eligibility matches: <strong style={{ color: '#34d399' }}>{eligibleJobs.length} active drives</strong> qualify your profile today.
          </p>
        </div>

        <button
          className="btn btn-sql"
          onClick={handleShowEligibilitySql}
        >
          <Database size={16} />
          <span>Inspect Eligibility SQL</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="stat-card-grid">
        <StatCard
          title="Attendance Rate"
          value={`${attPct.toFixed(1)}%`}
          subtext={isAttLow ? '⚠️ Below 75% minimum threshold' : '✓ Above institute threshold'}
          icon={CalendarCheck}
          color={isAttLow ? '#fb7185' : '#10b981'}
        />

        <StatCard
          title="Avg Mock Score"
          value={`${mockPct.toFixed(1)}%`}
          subtext={isMockLow ? '⚠️ Needs improvement (<60%)' : '✓ Good technical readiness'}
          icon={Award}
          color={isMockLow ? '#f59e0b' : '#8b5cf6'}
        />

        <StatCard
          title="Academic CGPA"
          value={Number(user?.cgpa || 0).toFixed(2)}
          subtext="Verified institute records"
          icon={CheckCircle2}
          color="#06b6d4"
        />

        <StatCard
          title="Applications Sent"
          value={applications.length}
          subtext="Tracked on HR Kanban"
          icon={Clock}
          color="#6366f1"
        />
      </div>

      {/* Main Grid: Campus Drives & Recent Applications */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Campus Drives Live Feed */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Active Campus Drives</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Real-time relational eligibility matching
              </p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('jobs')}>
              View All <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', flex: 1 }}>
            {jobs.slice(0, 3).map((job) => {
              const hasApplied = Boolean(job.application);

              return (
                <div
                  key={job.job_id}
                  className="glass-card glass-card-interactive"
                  style={{ padding: '1rem', background: 'rgba(17, 24, 39, 0.5)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', color: '#ffffff' }}>{job.company_name}</h4>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{job.job_profile}</p>
                    </div>
                    <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                      {job.package_lpa} LPA
                    </span>
                  </div>

                  {/* Eligibility Status Tag */}
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {job.is_eligible ? (
                      <span className="badge badge-success">
                        <CheckCircle2 size={12} /> Eligible to Apply
                      </span>
                    ) : (
                      <span className="badge badge-danger" title={job.eligibility_reasons?.join(', ')}>
                        <AlertTriangle size={12} /> Ineligible ({job.eligibility_reasons?.[0]?.split('(')[0] || 'Criteria not met'})
                      </span>
                    )}

                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        if (onSelectJob) onSelectJob(job.job_id);
                        else onNavigate('jobs');
                      }}
                      style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    >
                      {hasApplied ? `Status: ${job.application.status}` : 'View Details'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* My Applications Pipeline Status */}
        <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>My Application Pipeline</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Real-time updates from HR Kanban
              </p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => onNavigate('applications')}>
              Details <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {applications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <Clock size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>No active applications</p>
                <p style={{ fontSize: '0.75rem' }}>Browse eligible drives and apply with 1-click</p>
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.application_id}
                  style={{
                    padding: '0.875rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#ffffff' }}>
                      {app.company_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {app.job_profile} • {app.package_lpa} LPA
                    </div>
                  </div>

                  <span
                    className={`badge ${
                      app.status === 'SELECTED'
                        ? 'badge-success'
                        : app.status === 'SHORTLISTED'
                        ? 'badge-purple'
                        : app.status === 'MOCK_PENDING'
                        ? 'badge-warning'
                        : app.status === 'REJECTED'
                        ? 'badge-danger'
                        : 'badge-info'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <SqlModal
        isOpen={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
        title={selectedSqlData.title}
        sql={selectedSqlData.sql}
        explanation={selectedSqlData.explanation}
      />
    </div>
  );
}
