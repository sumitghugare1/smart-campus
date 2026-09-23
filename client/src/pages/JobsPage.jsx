import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import SqlModal from '../components/SqlModal';
import {
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  ArrowRight,
  Database,
  Calendar,
  Building,
  GraduationCap
} from 'lucide-react';

export default function JobsPage({ onSelectJob, onNavigateToCreate }) {
  const { user, isStudent, isHr, isAdmin } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEligibleOnly, setFilterEligibleOnly] = useState(false);
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [activeJobSql, setActiveJobSql] = useState({ jobId: null, sql: '', title: '' });

  const fetchJobs = async () => {
    try {
      const data = await api.getJobs();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    const refreshOnFocus = () => fetchJobs();
    const refreshTimer = window.setInterval(fetchJobs, 5000);
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, []);

  const handleApply = async (jobId, e) => {
    e.stopPropagation();
    try {
      await api.applyJob(jobId);
      // Refresh jobs list to update status
      fetchJobs();
      alert('🎉 Application submitted successfully! HR has been notified.');
    } catch (err) {
      alert(`Application Error: ${err.message}`);
    }
  };

  const handleInspectSql = (job, e) => {
    e.stopPropagation();
    setActiveJobSql({
      jobId: job.job_id,
      title: `Eligibility Engine Query: ${job.company_name}`,
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
WHERE j.job_id = ${job.job_id} AND u.role = 'STUDENT';`
    });
    setSqlModalOpen(true);
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.company_name.toLowerCase().includes(search.toLowerCase()) ||
      job.job_profile.toLowerCase().includes(search.toLowerCase());
    if (isStudent && filterEligibleOnly) {
      return matchesSearch && job.is_eligible;
    }
    return matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Campus Placement Drives</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Structured job criteria verified against attendance, mock exams, and technical skill matrices.
          </p>
        </div>

        {isHr && (
          <button
            id="btn-post-new-drive"
            className="btn btn-primary"
            onClick={onNavigateToCreate}
          >
            + Post New Campus Drive
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <input
            id="job-search-input"
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
            placeholder="Search company, job role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        {isStudent && (
          <button
            id="btn-filter-eligible"
            className={`btn ${filterEligibleOnly ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setFilterEligibleOnly(!filterEligibleOnly)}
          >
            <CheckCircle2 size={14} />
            <span>Show Eligible Only ({jobs.filter(j => j.is_eligible).length})</span>
          </button>
        )}
      </div>

      {/* Jobs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
        {filteredJobs.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Briefcase size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>No placement drives found</h3>
            <p style={{ fontSize: '0.8125rem' }}>Try clearing your search or filter</p>
          </div>
        ) : (
          filteredJobs.map((job) => {
            const hasApplied = Boolean(job.application);

            return (
              <div
                key={job.job_id}
                className="glass-card glass-card-interactive"
                style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
                onClick={() => onSelectJob && onSelectJob(job.job_id)}
              >
                {/* Company & Role Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>{job.company_name}</h3>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{job.job_profile}</p>
                  </div>
                  <span className="badge badge-purple" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.7rem' }}>
                    {job.package_lpa} LPA
                  </span>
                </div>

                {/* Criteria Overview Badges */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.5rem', borderRadius: 4 }}>
                    Min CGPA: <strong style={{ color: '#fff' }}>{Number(job.min_cgpa).toFixed(1)}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.5rem', borderRadius: 4 }}>
                    Passout Year: <strong style={{ color: '#fff' }}>{job.eligible_passout_year}</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.5rem', borderRadius: 4 }}>
                    Min Attendance: <strong style={{ color: '#fff' }}>{job.min_attendance}%</strong>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.5rem', borderRadius: 4 }}>
                    Min Mock Avg: <strong style={{ color: '#fff' }}>{job.min_mock_score}%</strong>
                  </div>
                </div>

                {/* Required Skills */}
                {job.required_skills && job.required_skills.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Required Tech Stack
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {job.required_skills.map((s) => (
                        <span key={s.skill_id} className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Eligibility Tag & Action for Students */}
                {isStudent && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {job.is_eligible ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> You are Eligible
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          <AlertTriangle size={12} /> Ineligible
                        </span>
                      )}

                      <button
                        className="btn btn-sql btn-sm"
                        onClick={(e) => handleInspectSql(job, e)}
                        title="View eligibility SQL query"
                      >
                        <Database size={12} /> SQL
                      </button>
                    </div>

                    {!job.is_eligible && job.eligibility_reasons && job.eligibility_reasons.length > 0 && (
                      <div style={{ padding: '0.5rem 0.75rem', borderRadius: 6, background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.25)', fontSize: '0.75rem', color: '#fca5a5' }}>
                        <strong>Reason:</strong> {job.eligibility_reasons.join(', ')}
                      </div>
                    )}

                    {hasApplied ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Status:</span>
                        <span className="badge badge-info">{job.application.status}</span>
                      </div>
                    ) : (
                      <button
                        className="btn btn-primary"
                        disabled={!job.is_eligible}
                        onClick={(e) => handleApply(job.job_id, e)}
                        style={{ marginTop: '0.25rem' }}
                      >
                        {job.is_eligible ? 'Apply Now' : 'Ineligible to Apply'}
                        <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                )}

                {/* HR / Admin View */}
                {!isStudent && (
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Total Apps: <strong>{job.total_applications || 0}</strong> • Eligible Pool: <strong style={{ color: '#34d399' }}>{job.eligible_students_count ?? '—'}</strong>
                    </div>

                    <button
                      className="btn btn-sql btn-sm"
                      onClick={(e) => handleInspectSql(job, e)}
                    >
                      <Database size={12} /> SQL Check
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <SqlModal
        isOpen={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
        title={activeJobSql.title}
        sql={activeJobSql.sql}
        explanation="Relational SQL cross join between student stats view, attendance percentages, and job criteria with NOT EXISTS set containment for required skills."
      />
    </div>
  );
}
