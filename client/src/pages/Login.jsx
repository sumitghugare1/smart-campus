import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, ArrowRight, Lock, Mail } from 'lucide-react';

export default function Login({ onNavigateToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-intro">
          <div className="auth-brand-mark"><Sparkles size={17} /></div>
          <p className="auth-eyebrow">QTalk Workspace</p>
          <h1>One place for every team to move forward.</h1>
          <p className="auth-intro-copy">Connect placement teams, trainers, students, and hiring partners in a workspace shaped around how your organization works.</p>
          <div className="auth-proof"><span className="auth-proof-dot" /> Your organization workspace is ready</div>
        </section>

        <section className="auth-card glass-card">
          <div className="auth-card-heading">
            <div>
              <p className="auth-kicker">Welcome back</p>
              <h2>Sign in to your workspace</h2>
              <p>Continue conversations, tasks, and placement work.</p>
            </div>
            <div className="auth-secure"><Lock size={14} /> Secure</div>
          </div>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.6rem', borderRadius: 9999, background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              <Sparkles size={12} />
              <span>Smart Institute Portal</span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Sign in to QTalk</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
              Structured campus placement, eligibility engine & smart communication.
            </p>
          </div>

          {error && (
            <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fb7185', fontSize: '0.8125rem', marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-email-input"
                  type="email"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@qtalk.edu"
                  required
                />
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password-input"
                  type="password"
                  className="form-input"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Are you a new student?{' '}
            <button
              id="goto-register-btn"
              type="button"
              onClick={onNavigateToRegister}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
            >
              Create student account
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
