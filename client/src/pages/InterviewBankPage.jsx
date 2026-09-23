import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Award, Search, PlusCircle, Star, Building, X, MessageSquare } from 'lucide-react';

export default function InterviewBankPage() {
  const [experiences, setExperiences] = useState([]);
  const [metadata, setMetadata] = useState({ companies: [], rounds: [] });
  const [filters, setFilters] = useState({ company: '', round: '', search: '', difficulty: '' });
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    job_role: 'Associate Software Engineer',
    round_type: 'Technical Round 1',
    questions_text: '',
    difficulty_rating: 4
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchInterviews = async () => {
    try {
      const [expRes, metaRes] = await Promise.all([
        api.getInterviews(filters),
        api.getInterviewMetadata()
      ]);
      setExperiences(expRes.experiences || []);
      setMetadata(metaRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, [filters]);

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.shareInterview(form);
      alert('✓ Thank you! Your interview experience has been shared with your peers.');
      setShareModalOpen(false);
      setForm({
        company_name: '',
        job_role: 'Associate Software Engineer',
        round_type: 'Technical Round 1',
        questions_text: '',
        difficulty_rating: 4
      });
      fetchInterviews();
    } catch (err) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Interview Intelligence Bank</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Real candidate questions and round breakdowns contributed by seniors and placed alumni.
          </p>
        </div>

        <button
          id="btn-share-interview"
          className="btn btn-primary"
          onClick={() => setShareModalOpen(true)}
        >
          <PlusCircle size={16} />
          <span>Share Interview Experience</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-card" style={{ padding: '1rem 1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '2.5rem' }}
            placeholder="Search questions or keywords..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>

        <select
          className="form-select"
          value={filters.company}
          onChange={(e) => setFilters({ ...filters, company: e.target.value })}
        >
          <option value="">All Companies</option>
          {metadata.companies?.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          className="form-select"
          value={filters.round}
          onChange={(e) => setFilters({ ...filters, round: e.target.value })}
        >
          <option value="">All Selection Rounds</option>
          {metadata.rounds?.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {/* Experiences Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {experiences.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>No interview experiences match your filters</h3>
            <p style={{ fontSize: '0.8125rem' }}>Be the first to share questions from your recent drive!</p>
          </div>
        ) : (
          experiences.map((exp) => (
            <div key={exp.experience_id} className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Building size={16} color="var(--primary)" />
                    <h3 style={{ fontSize: '1.2rem', color: '#ffffff' }}>{exp.company_name}</h3>
                    <span className="badge badge-purple">{exp.round_type}</span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Role: {exp.job_role} • Contributed by {exp.student_name}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '0.25rem' }}>Difficulty:</span>
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      fill={i < exp.difficulty_rating ? '#f59e0b' : 'none'}
                      color={i < exp.difficulty_rating ? '#f59e0b' : 'var(--text-muted)'}
                    />
                  ))}
                </div>
              </div>

              {/* Questions */}
              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                <pre style={{
                  fontFamily: 'inherit',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  color: '#e2e8f0',
                  whiteSpace: 'pre-wrap'
                }}>
                  {exp.questions_text}
                </pre>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Share Modal */}
      {shareModalOpen && (
        <div className="modal-overlay" onClick={() => setShareModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem' }}>Share Interview Questions</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setShareModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleShareSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.company_name}
                      onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                      placeholder="e.g. TCS Digital, Amazon"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Job Role</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.job_role}
                      onChange={(e) => setForm({ ...form, job_role: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Round Type</label>
                    <select
                      className="form-select"
                      value={form.round_type}
                      onChange={(e) => setForm({ ...form, round_type: e.target.value })}
                    >
                      <option value="Online Assessment / Coding">Online Assessment / Coding</option>
                      <option value="Technical Round 1">Technical Round 1</option>
                      <option value="Technical Round 2">Technical Round 2</option>
                      <option value="System Design">System Design</option>
                      <option value="HR / Managerial">HR / Managerial</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Difficulty Rating (1-5)</label>
                    <select
                      className="form-select"
                      value={form.difficulty_rating}
                      onChange={(e) => setForm({ ...form, difficulty_rating: parseInt(e.target.value) })}
                    >
                      <option value="1">1 - Very Easy</option>
                      <option value="2">2 - Easy</option>
                      <option value="3">3 - Moderate</option>
                      <option value="4">4 - Challenging</option>
                      <option value="5">5 - Hard</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Questions & Interview Insights *</label>
                  <textarea
                    className="form-textarea"
                    value={form.questions_text}
                    onChange={(e) => setForm({ ...form, questions_text: e.target.value })}
                    placeholder="List the technical and situational questions asked, coding problems, and tips..."
                    rows={6}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShareModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Sharing...' : 'Publish Experience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
