import React, { useState, useEffect } from 'react';
import { api } from '../api';
import KanbanBoard from '../components/KanbanBoard';
import SqlModal from '../components/SqlModal';
import StatCard from '../components/StatCard';
import {
  Award,
  Users,
  CheckCircle,
  Eye,
  PlusCircle,
  Database,
  ArrowRight,
  Clock,
  Filter
} from 'lucide-react';

export default function HrDashboard({ onNavigateToCreate }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [applications, setApplications] = useState([]);
  const [readStats, setReadStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [sqlData, setSqlData] = useState({ title: '', sql: '', explanation: '' });

  const fetchJobsAndSelect = async () => {
    try {
      const data = await api.getJobs();
      const jobList = data.jobs || [];
      setJobs(jobList);
      if (jobList.length > 0 && !selectedJobId) {
        setSelectedJobId(jobList[0].job_id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsAndSelect();
  }, []);

  // When selectedJobId changes, load applications and read stats
  useEffect(() => {
    if (!selectedJobId) return;

    async function loadJobData() {
      try {
        const [appsRes, readRes] = await Promise.all([
          api.getJobApplications(selectedJobId),
          api.getJobReadStats(selectedJobId)
        ]);
        setApplications(appsRes.applications || []);
        setReadStats(readRes);
      } catch (err) {
        console.error(err);
      }
    }

    loadJobData();
    const interval = setInterval(loadJobData, 5000);
    return () => clearInterval(interval);
  }, [selectedJobId]);

  const handleStatusChange = async (appId, newStatus) => {
    try {
      await api.updateApplicationStatus(appId, newStatus);
      // Optimistically update
      setApplications(prev =>
        prev.map(a => a.application_id === appId ? { ...a, status: newStatus } : a)
      );
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const selectedJob = jobs.find(j => j.job_id === selectedJobId) || jobs[0];

  const handleShowReadAuditSql = () => {
    setSqlData({
      title: 'HR Notification Read Tracking SQL',
      sql: `SELECT u.full_name, u.email, n.is_read, n.created_at
FROM notifications n 
JOIN users u ON u.user_id = n.user_id
WHERE n.job_id = ${selectedJobId} AND n.is_read = FALSE;`,
      explanation: 'Relational query joining notifications with users to audit candidate engagement and identify students who have not yet acknowledged drive notifications.'
    });
    setSqlModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Placement Pipeline Operations</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Manage candidate progression on Kanban, verify SQL criteria, and monitor read engagement.
          </p>
        </div>

        <button
          id="btn-hr-create-job"
          className="btn btn-primary"
          onClick={onNavigateToCreate}
        >
          <PlusCircle size={16} />
          <span>Post New Campus Drive</span>
        </button>
      </div>

      {/* Select Job Drive Selector Tabs */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Active Campus Drive:
          </span>
          <select
            id="hr-job-selector"
            className="form-select"
            value={selectedJobId || ''}
            onChange={(e) => setSelectedJobId(parseInt(e.target.value))}
            style={{ fontWeight: 600 }}
          >
            {jobs.map((j) => (
              <option key={j.job_id} value={j.job_id}>
                {j.company_name} — {j.job_profile} ({j.package_lpa} LPA)
              </option>
            ))}
          </select>
        </div>

        {selectedJob && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8125rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Eligible Pool: <strong style={{ color: '#34d399' }}>{selectedJob.eligible_students_count ?? '—'} students</strong>
            </span>
            <button className="btn btn-sql btn-sm" onClick={handleShowReadAuditSql}>
              <Database size={12} /> Inspect Read Tracking SQL
            </button>
          </div>
        )}
      </div>

      {/* Top Metrics for Selected Drive */}
      {readStats && (
        <div className="stat-card-grid">
          <StatCard
            title="Total Applications"
            value={applications.length}
            subtext="In active pipeline"
            icon={Users}
            color="#6366f1"
          />

          <StatCard
            title="Notification Open Rate"
            value={`${readStats.openRate}%`}
            subtext={`${readStats.openedCount} of ${readStats.totalNotified} eligible notified opened`}
            icon={Eye}
            color="#8b5cf6"
          />

          <StatCard
            title="Placed / Selected"
            value={applications.filter(a => a.status === 'SELECTED').length}
            subtext="Offer acceptances"
            icon={Award}
            color="#10b981"
          />

          <StatCard
            title="Pending Decisions"
            value={applications.filter(a => a.status === 'APPLIED' || a.status === 'SHORTLISTED' || a.status === 'MOCK_PENDING').length}
            subtext="Active in board"
            icon={Clock}
            color="#f59e0b"
          />
        </div>
      )}

      {/* Kanban Board */}
      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {selectedJob?.company_name} — Candidate Pipeline
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Advance candidates through hiring stages with 1-click status transitions.
            </p>
          </div>
        </div>

        <KanbanBoard
          applications={applications}
          onStatusChange={handleStatusChange}
        />
      </div>

      {/* Read Tracking Audit (Document Section 6.4) */}
      {readStats && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Targeted Notification Audit (Read vs Unread)</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Verifies who saw the drive alert in their feed vs unread status.
              </p>
            </div>
            <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
              {readStats.unreadCount} unread alerts
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '0.625rem' }}>Candidate</th>
                  <th style={{ padding: '0.625rem' }}>Email</th>
                  <th style={{ padding: '0.625rem' }}>Batch</th>
                  <th style={{ padding: '0.625rem' }}>Notification Status</th>
                  <th style={{ padding: '0.625rem' }}>Dispatched At</th>
                </tr>
              </thead>
              <tbody>
                {readStats.recipients?.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No targeted notifications dispatched for this drive yet.
                    </td>
                  </tr>
                ) : (
                  readStats.recipients?.map((r) => (
                    <tr key={r.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.625rem', fontWeight: 600, color: '#ffffff' }}>{r.full_name}</td>
                      <td style={{ padding: '0.625rem', color: 'var(--text-secondary)' }}>{r.email}</td>
                      <td style={{ padding: '0.625rem' }}><span className="badge badge-neutral">{r.batch_code || 'BATCH-2026'}</span></td>
                      <td style={{ padding: '0.625rem' }}>
                        {r.is_read ? (
                          <span className="badge badge-success">✓ Opened & Read</span>
                        ) : (
                          <span className="badge badge-warning">⏳ Unopened</span>
                        )}
                      </td>
                      <td style={{ padding: '0.625rem', color: 'var(--text-muted)' }}>
                        {new Date(r.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
