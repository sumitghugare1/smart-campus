import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import SqlModal from '../components/SqlModal';
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building,
  Calendar,
  Database,
  Award
} from 'lucide-react';

export default function JobDetailsPage({ jobId, onBack, onNavigateToPipeline }) {
  const { user, isStudent, isHr } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sqlModalOpen, setSqlModalOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  const fetchJob = async () => {
    try {
      const data = await api.getJobDetails(jobId);
      setJob(data.job);
    } catch (err) {
      setError(err.message || 'Failed to load drive details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.applyJob(jobId);
      alert('🎉 Application submitted successfully! Track your status on My Applications.');
      fetchJob();
    } catch (err) {
      alert(`Application Error: ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading drive specifications...</div>;
  }

  if (error || !job) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#fb7185' }}>{error || 'Job not found'}</p>
        <button className="btn btn-outline" onClick={onBack} style={{ marginTop: '1rem' }}>
          <ArrowLeft size={16} /> Back to Drives
        </button>
      </div>
    );
  }

  const breakdown = job.criteria_breakdown || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
      <button className="btn btn-outline btn-sm" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        <ArrowLeft size={16} /> Back to Campus Drives
      </button>

      {/* Main Card */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Building size={16} color="var(--primary)" />
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Campus Recruitment Drive</span>
            </div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800 }}>{job.company_name}</h1>
            <p style={{ fontSize: '1.1rem', color: '#c4b5fd', marginTop: '0.2rem' }}>{job.job_profile}</p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>
              {job.package_lpa} LPA
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Annual Cost to Company</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Role Description</h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9rem' }}>
            {job.description || 'Enterprise role focused on scalable application design and database engineering.'}
          </p>
        </div>

        {/* Required Skills */}
        {job.required_skills && job.required_skills.length > 0 && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Required Technical Skills</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {job.required_skills.map((s) => (
                <span key={s.skill_id} className="badge badge-purple" style={{ padding: '0.35rem 0.75rem' }}>
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Student 5-Point Eligibility Verification Breakdown */}
        {isStudent && (
          <div style={{ marginTop: '2rem', padding: '1.25rem', borderRadius: 'var(--radius-lg)', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '1rem' }}>Your Relational Eligibility Evaluation</h3>
              </div>
              <button className="btn btn-sql btn-sm" onClick={() => setSqlModalOpen(true)}>
                <Database size={12} /> View Evaluation SQL
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(17, 24, 39, 0.6)', borderRadius: 6 }}>
                {breakdown.cgpa_ok ? <CheckCircle2 size={16} color="#34d399" /> : <XCircle size={16} color="#fb7185" />}
                <span style={{ fontSize: '0.8125rem' }}>Min CGPA: <strong>{Number(job.min_cgpa).toFixed(1)}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(17, 24, 39, 0.6)', borderRadius: 6 }}>
                {breakdown.year_ok ? <CheckCircle2 size={16} color="#34d399" /> : <XCircle size={16} color="#fb7185" />}
                <span style={{ fontSize: '0.8125rem' }}>Eligible Passout: <strong>{job.eligible_passout_year}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(17, 24, 39, 0.6)', borderRadius: 6 }}>
                {breakdown.attendance_ok ? <CheckCircle2 size={16} color="#34d399" /> : <XCircle size={16} color="#fb7185" />}
                <span style={{ fontSize: '0.8125rem' }}>Min Attendance: <strong>{job.min_attendance}%</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(17, 24, 39, 0.6)', borderRadius: 6 }}>
                {breakdown.mock_ok ? <CheckCircle2 size={16} color="#34d399" /> : <XCircle size={16} color="#fb7185" />}
                <span style={{ fontSize: '0.8125rem' }}>Min Mock Score: <strong>{job.min_mock_score}%</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(17, 24, 39, 0.6)', borderRadius: 6, gridColumn: '1 / -1' }}>
                {breakdown.skills_ok ? <CheckCircle2 size={16} color="#34d399" /> : <XCircle size={16} color="#fb7185" />}
                <span style={{ fontSize: '0.8125rem' }}>Skill Match: <strong>{breakdown.skills_ok ? 'All required skills verified' : 'Missing required technical skill'}</strong></span>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                {job.is_eligible ? (
                  <span className="badge badge-success" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}>
                    <CheckCircle2 size={14} /> Congratulations! You are eligible to apply.
                  </span>
                ) : (
                  <span className="badge badge-danger" style={{ fontSize: '0.8125rem', padding: '0.35rem 0.75rem' }}>
                    <AlertTriangle size={14} /> Criteria not met: {job.eligibility_reasons?.join(', ')}
                  </span>
                )}
              </div>

              {job.application ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Current Status:</span>
                  <span className="badge badge-info" style={{ fontSize: '0.875rem' }}>
                    {job.application.status}
                  </span>
                </div>
              ) : (
                <button
                  id="btn-apply-job-detail"
                  className="btn btn-primary"
                  disabled={!job.is_eligible || applying}
                  onClick={handleApply}
                >
                  {applying ? 'Submitting...' : 'Apply for this Position'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* HR Controls */}
        {isHr && (
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Posted by {job.hr_name} • Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'Rolling'}
            </div>
            <button className="btn btn-primary btn-sm" onClick={onNavigateToPipeline}>
              Open Pipeline Kanban
            </button>
          </div>
        )}
      </div>

      <SqlModal
        isOpen={sqlModalOpen}
        onClose={() => setSqlModalOpen(false)}
        title={`SQL Eligibility Engine: ${job.company_name}`}
        sql={`SELECT u.user_id, u.full_name,
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
WHERE j.job_id = ${job.job_id} AND u.user_id = ${user?.user_id || 1};`}
        explanation="Relational SQL check confirming CGPA, passout year, aggregate attendance, mock averages, and skills set inclusion."
      />
    </div>
  );
}
