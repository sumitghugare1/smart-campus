import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import StatCard from '../components/StatCard';
import {
  CalendarCheck,
  Award,
  AlertTriangle,
  CheckCircle,
  Users,
  Save,
  PlusCircle,
  Clock
} from 'lucide-react';

export default function TrainerDashboard() {
  const { user } = useAuth();
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(1);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);

  // Attendance state
  const [attendanceStudents, setAttendanceStudents] = useState([]);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Mock score state
  const [mockForm, setMockForm] = useState({
    student_id: '',
    subject: 'SQL & Database Optimization',
    score: 85,
    max_score: 100
  });
  const [savingMock, setSavingMock] = useState(false);

  // Readiness data
  const [readiness, setReadiness] = useState(null);
  const [activeTab, setActiveTab] = useState('readiness'); // 'readiness', 'attendance', 'mocks'

  useEffect(() => {
    async function loadBatches() {
      try {
        const bData = await api.getMyBatches();
        setBatches(bData.batches || []);
        if (bData.batches && bData.batches.length > 0) {
          setSelectedBatchId(bData.batches[0].batch_id);
        } else {
          setSelectedBatchId(null);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadBatches();
    const refreshOnFocus = () => loadBatches();
    const refreshTimer = window.setInterval(loadBatches, 5000);
    window.addEventListener('focus', refreshOnFocus);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, []);

  const loadBatchData = async () => {
    if (!selectedBatchId) return;
    try {
      const [readinessRes, attStudentsRes] = await Promise.all([
        api.getBatchReadiness(selectedBatchId),
        api.getBatchStudentsForAttendance(selectedBatchId, sessionDate)
      ]);
      setReadiness(readinessRes);
      setAttendanceStudents(attStudentsRes.students || []);
      if (attStudentsRes.students && attStudentsRes.students.length > 0 && !mockForm.student_id) {
        setMockForm(prev => ({ ...prev, student_id: attStudentsRes.students[0].user_id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadBatchData();
  }, [selectedBatchId, sessionDate]);

  const handleToggleAttendance = (studentId) => {
    setAttendanceStudents(prev =>
      prev.map(s => s.user_id === studentId ? { ...s, present: !s.present } : s)
    );
  };

  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    try {
      const records = attendanceStudents.map(s => ({
        student_id: s.user_id,
        present: s.present
      }));
      await api.markAttendance(sessionDate, selectedBatchId, records);
      alert(`✓ Attendance recorded for ${records.length} students.`);
      await loadBatchData();
    } catch (err) {
      alert(`Error saving attendance: ${err.message}`);
    } finally {
      setSavingAttendance(false);
    }
  };

  const handleSaveMock = async (e) => {
    e.preventDefault();
    setSavingMock(true);
    try {
      await api.submitMockScore({
        ...mockForm,
        student_id: parseInt(mockForm.student_id),
        score: parseInt(mockForm.score),
        max_score: parseInt(mockForm.max_score)
      });
      alert('✓ Mock interview score recorded and published to student!');
      loadBatchData();
    } catch (err) {
      alert(`Error saving mock score: ${err.message}`);
    } finally {
      setSavingMock(false);
    }
  };

  if (!batches.length) {
    return (
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <AlertTriangle size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>No batches assigned yet</h3>
        <p style={{ fontSize: '0.8125rem', maxWidth: 420, margin: '0.5rem auto 0' }}>
          Your Manager hasn&apos;t granted you access to any batch. Once assigned, you&apos;ll be able to mark
          attendance, log mock scores, and upload resources for that batch here.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Trainer Operations & Batch Readiness</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Daily attendance, technical mock evaluation, and automated at-risk student monitoring.
          </p>
        </div>

        {/* Batch Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Selected Batch:</span>
          <select
            className="form-select"
            value={selectedBatchId || ''}
            onChange={(e) => setSelectedBatchId(parseInt(e.target.value))}
            style={{ fontWeight: 600 }}
          >
            {batches.map(b => (
              <option key={b.batch_id} value={b.batch_id}>
                {b.batch_code} ({b.course_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats */}
      {readiness && (
        <div className="stat-card-grid">
          <StatCard
            title="Batch Size"
            value={readiness.totalStudents}
            subtext="Registered candidates"
            icon={Users}
            color="#6366f1"
          />

          <StatCard
            title="Avg Batch Attendance"
            value={`${readiness.avgAttendance}%`}
            subtext="Calculated across all sessions"
            icon={CalendarCheck}
            color={parseFloat(readiness.avgAttendance) < 75 ? '#fb7185' : '#10b981'}
          />

          <StatCard
            title="Avg Mock Score"
            value={`${readiness.avgMock}%`}
            subtext="Technical mock readiness"
            icon={Award}
            color="#8b5cf6"
          />

          <StatCard
            title="Students At Risk"
            value={readiness.atRiskCount}
            subtext="<75% attendance or <60% mock"
            icon={AlertTriangle}
            color={readiness.atRiskCount > 0 ? '#fb7185' : '#10b981'}
          />
        </div>
      )}

      {/* Tab Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'readiness' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          onClick={() => setActiveTab('readiness')}
        >
          <Award size={14} /> Batch Readiness Matrix
        </button>
        <button
          className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          onClick={() => setActiveTab('attendance')}
        >
          <CalendarCheck size={14} /> Daily Attendance Sheet
        </button>
        <button
          className={`btn ${activeTab === 'mocks' ? 'btn-primary' : 'btn-outline'} btn-sm`}
          onClick={() => setActiveTab('mocks')}
        >
          <PlusCircle size={14} /> Log Mock Score
        </button>
      </div>

      {/* Tab 1: Readiness Matrix */}
      {activeTab === 'readiness' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Student Performance & Risk Classification</h3>
            <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
              Real-time student_stats view
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Student Name</th>
                  <th style={{ padding: '0.75rem' }}>CGPA</th>
                  <th style={{ padding: '0.75rem' }}>Attendance %</th>
                  <th style={{ padding: '0.75rem' }}>Avg Mock %</th>
                  <th style={{ padding: '0.75rem' }}>Technical Skills</th>
                  <th style={{ padding: '0.75rem' }}>Risk Status</th>
                </tr>
              </thead>
              <tbody>
                {readiness?.students?.map(s => {
                  return (
                    <tr key={s.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: '#ffffff' }}>
                        <div>{s.full_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.email}</div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>{Number(s.cgpa).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ color: parseFloat(s.attendance_pct) < 75 ? '#fb7185' : '#34d399', fontWeight: 600 }}>
                          {Number(s.attendance_pct).toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <span style={{ color: parseFloat(s.avg_mock_pct) < 60 ? '#fb7185' : '#c4b5fd', fontWeight: 600 }}>
                          {Number(s.avg_mock_pct).toFixed(1)}%
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {s.skills?.map((sk, idx) => (
                            <span key={idx} className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                              {sk}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {s.is_at_risk ? (
                          <span className="badge badge-danger">
                            ⚠️ At Risk ({parseFloat(s.attendance_pct) < 75 ? 'Low Att.' : 'Low Mock'})
                          </span>
                        ) : (
                          <span className="badge badge-success">
                            ✓ Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Daily Attendance Sheet */}
      {activeTab === 'attendance' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Mark Attendance</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Click toggle to mark Present/Absent for each student.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="date"
                className="form-input"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
              <button
                id="btn-save-attendance"
                className="btn btn-primary"
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
              >
                <Save size={16} />
                <span>{savingAttendance ? 'Saving...' : 'Save Attendance Sheet'}</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {attendanceStudents.map((st) => (
              <div
                key={st.user_id}
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
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#ffffff' }}>{st.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Current Attendance: {Number(st.attendance_pct || 0).toFixed(0)}%
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleAttendance(st.user_id)}
                  className={`btn ${st.present ? 'btn-primary' : 'btn-outline'} btn-sm`}
                  style={{
                    background: st.present ? '#10b981' : 'transparent',
                    borderColor: st.present ? '#10b981' : '#fb7185',
                    color: st.present ? '#ffffff' : '#fb7185',
                    minWidth: '100px'
                  }}
                >
                  {st.present ? '✓ Present' : '✗ Absent'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Mock Score Entry */}
      {activeTab === 'mocks' && (
        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Log Technical Mock Interview Score</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Records technical evaluation score into the candidate’s profile and dispatches an instant evaluation alert.
          </p>

          <form onSubmit={handleSaveMock}>
            <div className="form-group">
              <label className="form-label">Select Student</label>
              <select
                className="form-select"
                value={mockForm.student_id}
                onChange={(e) => setMockForm({ ...mockForm, student_id: e.target.value })}
                required
              >
                {attendanceStudents.map(s => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.full_name} ({s.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Subject / Evaluation Topic</label>
              <input
                type="text"
                className="form-input"
                value={mockForm.subject}
                onChange={(e) => setMockForm({ ...mockForm, subject: e.target.value })}
                placeholder="e.g. SQL Query Optimization, React System Design"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Score Awarded</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="form-input"
                  value={mockForm.score}
                  onChange={(e) => setMockForm({ ...mockForm, score: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max Score</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="form-input"
                  value={mockForm.max_score}
                  onChange={(e) => setMockForm({ ...mockForm, max_score: e.target.value })}
                  required
                />
              </div>
            </div>

            <button
              id="btn-submit-mock-score"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
              disabled={savingMock}
            >
              <Award size={16} />
              <span>{savingMock ? 'Recording...' : 'Publish Mock Score'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
