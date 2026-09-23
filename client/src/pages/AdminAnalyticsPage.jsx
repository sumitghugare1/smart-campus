import React, { useState, useEffect } from 'react';
import { api } from '../api';
import StatCard from '../components/StatCard';
import SqlModal from '../components/SqlModal';
import {
  BarChart3,
  Users,
  Award,
  CalendarCheck,
  Briefcase,
  Database,
  ArrowRight,
  TrendingUp,
  Building
} from 'lucide-react';

export default function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [sqlData, setSqlData] = useState({ title: '', sql: '', explanation: '' });

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await api.getAnalyticsDashboard();
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  const handleShowSql = (title, sqlKey, explanation) => {
    setSqlData({
      title,
      sql: data?.queries?.[sqlKey] || '',
      explanation
    });
    setSqlModalOpen(true);
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Aggregating institute placement analytics...</div>;
  }

  const kpis = data?.kpis || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Institute Placement Intelligence</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            SQL aggregations, funnel conversions, and cross-batch academic readiness benchmarks.
          </p>
        </div>

        <button
          className="btn btn-sql"
          onClick={() => handleShowSql(
            'Batch Placements Aggregation Query',
            'placementsSql',
            'Grouping students and applications per batch with relational FILTER (WHERE status = SELECTED) aggregation.'
          )}
        >
          <Database size={16} />
          <span>Inspect Analytics SQL</span>
        </button>
      </div>

      {/* Institute KPIs */}
      <div className="stat-card-grid">
        <StatCard
          title="Active Students"
          value={kpis.total_students || 0}
          subtext="Enrolled across all batches"
          icon={Users}
          color="#6366f1"
        />

        <StatCard
          title="Campus Drives"
          value={kpis.total_drives || 0}
          subtext="Hosted on platform"
          icon={Briefcase}
          color="#8b5cf6"
        />

        <StatCard
          title="Placed Students"
          value={kpis.total_placed_students || 0}
          subtext="Verified offer letters"
          icon={Award}
          color="#10b981"
        />

        <StatCard
          title="Institute Avg Attendance"
          value={`${kpis.overall_attendance || 0}%`}
          subtext="Aggregated via student_stats view"
          icon={CalendarCheck}
          color="#06b6d4"
        />
      </div>

      {/* Row 1: Placements per Batch & Application Funnel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* Placements per Batch (Document Section 6.4) */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Placements per Batch</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Enrolled students vs confirmed selections
              </p>
            </div>
            <button
              className="btn btn-sql btn-sm"
              onClick={() => handleShowSql(
                'Placements Per Batch Query',
                'placementsSql',
                'Aggregates distinct students enrolled in each batch against distinct applications with status = SELECTED.'
              )}
            >
              <Database size={12} /> SQL
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data?.placementsPerBatch?.map((b) => {
              const total = parseInt(b.total_students || 1);
              const placed = parseInt(b.placed_students || 0);
              const pct = total > 0 ? Math.round((placed / total) * 100) : 0;

              return (
                <div key={b.batch_code} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.875rem' }}>{b.batch_code}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{b.course_name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem' }}>{placed}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}> / {total} Placed</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden', marginTop: '0.5rem' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Application Funnel (Document Section 6.4) */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Application Funnel</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Stage distribution of all candidate submissions
              </p>
            </div>
            <button
              className="btn btn-sql btn-sm"
              onClick={() => handleShowSql(
                'Application Funnel Query',
                'funnelSql',
                'Groups all rows in job_applications by candidate status and counts occurrences.'
              )}
            >
              <Database size={12} /> SQL
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data?.applicationFunnel?.map((item) => {
              const statusColors = {
                APPLIED: '#6366f1',
                SHORTLISTED: '#8b5cf6',
                MOCK_PENDING: '#f59e0b',
                SELECTED: '#10b981',
                REJECTED: '#f43f5e'
              };
              const color = statusColors[item.status] || '#9ca3af';

              return (
                <div
                  key={item.status}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{item.status}</span>
                  </div>
                  <span className="badge" style={{ background: `${color}20`, color: color, fontSize: '0.8125rem' }}>
                    {item.count} Candidates
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Row 2: Attendance per Batch & Most Asked Interview Rounds */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        
        {/* Average Attendance per Batch (Document Section 6.4) */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Average Attendance per Batch</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Evaluated from student_stats database view
              </p>
            </div>
            <button
              className="btn btn-sql btn-sm"
              onClick={() => handleShowSql(
                'Average Attendance Per Batch Query',
                'attendanceSql',
                'Calculates average student attendance % grouped by batch from student_stats relational view.'
              )}
            >
              <Database size={12} /> SQL
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data?.attendancePerBatch?.map((b) => (
              <div
                key={b.batch_code}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#ffffff' }}>
                  {b.batch_code}
                </div>
                <span style={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: parseFloat(b.avg_attendance) < 75 ? '#fb7185' : '#34d399'
                }}>
                  {Number(b.avg_attendance).toFixed(1)}% Avg
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Asked Interview Rounds */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Interview Round Intelligence</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Most reported selection rounds from student seniors
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {data?.interviewRounds?.map((r) => (
              <div
                key={r.round_type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#ffffff' }}>
                    {r.round_type}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Avg Difficulty: {r.avg_difficulty} / 5
                  </div>
                </div>
                <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                  {r.count} Experiences
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <SqlModal
        isOpen={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
        title={sqlData.title}
        sql={sqlData.sql}
        explanation={sqlData.explanation}
      />
    </div>
  );
}
