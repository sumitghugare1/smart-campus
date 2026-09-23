import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ArrowLeft, Sparkles, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function CreateJobPage({ onBack, onSuccess }) {
  const [formData, setFormData] = useState({
    company_name: '',
    job_profile: '',
    description: '',
    package_lpa: '8.5',
    min_cgpa: '7.00',
    eligible_passout_year: '2026',
    min_attendance: 75,
    min_mock_score: 70,
    deadline: '2026-11-30',
    skill_ids: []
  });

  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdResult, setCreatedResult] = useState(null);

  useEffect(() => {
    async function loadSkills() {
      try {
        const data = await api.getSkills();
        setSkills(data.skills || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadSkills();
  }, []);

  const handleFillDemoValues = () => {
    const sqlSkill = skills.find(s => s.name.toUpperCase() === 'SQL');
    setFormData({
      company_name: 'Accenture Cloud & Digital',
      job_profile: 'Associate Software Engineer - Full Stack',
      description: 'Looking for 2026 graduates with solid SQL database foundations, consistent campus attendance (>75%), and good mock performance.',
      package_lpa: '7.5',
      min_cgpa: '7.00',
      eligible_passout_year: '2026',
      min_attendance: 75,
      min_mock_score: 70,
      deadline: '2026-11-15',
      skill_ids: sqlSkill ? [sqlSkill.skill_id] : []
    });
  };

  const handleSkillToggle = (skillId) => {
    setFormData(prev => ({
      ...prev,
      skill_ids: prev.skill_ids.includes(skillId)
        ? prev.skill_ids.filter(id => id !== skillId)
        : [...prev.skill_ids, skillId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.createJob({
        ...formData,
        package_lpa: parseFloat(formData.package_lpa),
        min_cgpa: parseFloat(formData.min_cgpa),
        eligible_passout_year: parseInt(formData.eligible_passout_year),
        min_attendance: parseInt(formData.min_attendance),
        min_mock_score: parseInt(formData.min_mock_score)
      });
      setCreatedResult(res);
    } catch (err) {
      setError(err.message || 'Job creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-outline btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={handleFillDemoValues}
          style={{ borderColor: 'rgba(139, 92, 246, 0.4)', color: '#c4b5fd' }}
        >
          <Sparkles size={14} /> Quick-Fill Demo Script Job
        </button>
      </div>

      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Create Structured Campus Drive</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            When published, the SQL eligibility engine will evaluate all registered candidates and automatically notify only eligible students.
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        {createdResult ? (
          <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <CheckCircle2 size={48} color="#34d399" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.3rem', color: '#ffffff' }}>Campus Drive Published Successfully!</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
              Company: <strong>{createdResult.job?.company_name}</strong> • Profile: <strong>{createdResult.job?.job_profile}</strong>
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', margin: '1.5rem 0' }}>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>
                  {createdResult.eligibleCount}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Eligible Candidates Found</div>
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#818cf8' }}>
                  {createdResult.notifiedCount}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Targeted Alerts Dispatched</div>
              </div>
              <div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#9ca3af' }}>
                  {createdResult.totalStudentsEvaluated}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Students Evaluated</div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={onSuccess || onBack}>
              Go to Pipeline Kanban
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Company Name *</label>
                <input
                  id="job-company-input"
                  type="text"
                  className="form-input"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="e.g. TCS Digital, Infosys, Amazon"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Job Profile / Designation *</label>
                <input
                  id="job-profile-input"
                  type="text"
                  className="form-input"
                  value={formData.job_profile}
                  onChange={(e) => setFormData({ ...formData, job_profile: e.target.value })}
                  placeholder="e.g. Associate Software Engineer"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Role Description</label>
              <textarea
                id="job-desc-input"
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Details about responsibilities, tech stack, and evaluation rounds..."
                rows={3}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Package (LPA) *</label>
                <input
                  id="job-lpa-input"
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={formData.package_lpa}
                  onChange={(e) => setFormData({ ...formData, package_lpa: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Min Academic CGPA</label>
                <input
                  id="job-cgpa-input"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  className="form-input"
                  value={formData.min_cgpa}
                  onChange={(e) => setFormData({ ...formData, min_cgpa: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Eligible Passout Year</label>
                <input
                  id="job-passout-input"
                  type="number"
                  className="form-input"
                  value={formData.eligible_passout_year}
                  onChange={(e) => setFormData({ ...formData, eligible_passout_year: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Sliders for Attendance & Mock thresholds */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '0.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label">Min Institute Attendance: <strong>{formData.min_attendance}%</strong></label>
                </div>
                <input
                  id="job-att-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.min_attendance}
                  onChange={(e) => setFormData({ ...formData, min_attendance: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label">Min Mock Exam Average: <strong>{formData.min_mock_score}%</strong></label>
                </div>
                <input
                  id="job-mock-slider"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.min_mock_score}
                  onChange={(e) => setFormData({ ...formData, min_mock_score: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Required Technical Skills */}
            <div className="form-group" style={{ marginTop: '1.25rem' }}>
              <label className="form-label">Mandatory Technical Skills (Candidates must possess all selected)</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                {skills.map((s) => {
                  const isChecked = formData.skill_ids.includes(s.skill_id);
                  return (
                    <button
                      key={s.skill_id}
                      type="button"
                      onClick={() => handleSkillToggle(s.skill_id)}
                      className={`badge ${isChecked ? 'badge-purple' : 'badge-neutral'}`}
                      style={{ cursor: 'pointer', padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                    >
                      {isChecked ? '✓ ' : '+ '} {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              id="btn-publish-drive"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem' }}
              disabled={loading}
            >
              <PlusCircle size={18} />
              <span>{loading ? 'Evaluating & Publishing...' : 'Publish Campus Drive & Notify Eligible Students'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
