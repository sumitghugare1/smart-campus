import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

export default function Register({ onNavigateToLogin }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    batch_id: '',
    cgpa: '8.00',
    passout_year: '2026',
    skill_ids: []
  });

  const [batches, setBatches] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadMeta() {
      try {
        const [bRes, sRes] = await Promise.all([api.getBatches(), api.getSkills()]);
        setBatches(bRes.batches || []);
        setSkills(sRes.skills || []);
        if (bRes.batches && bRes.batches.length > 0) {
          setFormData(prev => ({ ...prev, batch_id: bRes.batches[0].batch_id }));
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadMeta();
  }, []);

  const handleSkillToggle = (skillId) => {
    setFormData(prev => {
      const exists = prev.skill_ids.includes(skillId);
      return {
        ...prev,
        skill_ids: exists
          ? prev.skill_ids.filter(id => id !== skillId)
          : [...prev.skill_ids, skillId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        ...formData,
        cgpa: parseFloat(formData.cgpa),
        passout_year: parseInt(formData.passout_year),
        batch_id: parseInt(formData.batch_id)
      });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '2.5rem' }}>
        <button
          onClick={onNavigateToLogin}
          className="btn btn-outline btn-sm"
          style={{ marginBottom: '1.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <ArrowLeft size={14} /> Back to Sign In
        </button>

        <div style={{ marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Student Registration</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Set up your candidate profile for SQL-driven placement eligibility matching.
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                id="reg-fullname"
                type="text"
                className="form-input"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="e.g. Ananya Sharma"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="reg-email"
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ananya@qtalk.edu"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="reg-password"
              type="password"
              className="form-input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Batch</label>
              <select
                id="reg-batch"
                className="form-select"
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                required
              >
                {batches.map(b => (
                  <option key={b.batch_id} value={b.batch_id}>
                    {b.batch_code}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">CGPA (0 - 10)</label>
              <input
                id="reg-cgpa"
                type="number"
                step="0.01"
                min="0"
                max="10"
                className="form-input"
                value={formData.cgpa}
                onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Passout Year</label>
              <input
                id="reg-passout"
                type="number"
                min="2020"
                max="2030"
                className="form-input"
                value={formData.passout_year}
                onChange={(e) => setFormData({ ...formData, passout_year: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.5rem' }}>
            <label className="form-label">Your Technical Skills</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
              {skills.map(s => {
                const isSelected = formData.skill_ids.includes(s.skill_id);
                return (
                  <button
                    key={s.skill_id}
                    type="button"
                    onClick={() => handleSkillToggle(s.skill_id)}
                    className={`badge ${isSelected ? 'badge-purple' : 'badge-neutral'}`}
                    style={{ cursor: 'pointer', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  >
                    {isSelected ? '✓ ' : '+ '} {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            id="reg-submit-btn"
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.25rem', padding: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Creating Profile...' : 'Complete Registration'}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
