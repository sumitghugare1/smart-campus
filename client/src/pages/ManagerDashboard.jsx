import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, BriefcaseBusiness, GraduationCap, Users, PlusCircle, UserPlus, UserMinus } from 'lucide-react';
import { api } from '../api';
import StatCard from '../components/StatCard';

export default function ManagerDashboard() {
  const [overview, setOverview] = useState(null);
  const [batches, setBatches] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [staff, setStaff] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('batches');
  const [batchForm, setBatchForm] = useState({ batch_code: '', course_name: '', start_date: '' });
  const [subjectName, setSubjectName] = useState('');
  const [staffForm, setStaffForm] = useState({ full_name: '', email: '', password: 'password123', role: 'TRAINER' });
  const [assignmentForm, setAssignmentForm] = useState({ batch_id: '', trainer_id: '', subject_id: '' });
  const [studentForm, setStudentForm] = useState({ full_name: '', email: '', password: 'password123', batch_id: '', cgpa: '', passout_year: '' });
  const [saving, setSaving] = useState(false);

  const loadManagerData = async () => {
    try {
      const [overviewResponse, batchesResponse, subjectsResponse, staffResponse, studentsResponse] = await Promise.all([
        api.getManagerOverview(), api.getManagerBatches(), api.getManagerSubjects(), api.getManagerStaff(), api.getManagerStudents()
      ]);
      setOverview(overviewResponse);
      setBatches(batchesResponse.batches || []);
      setSubjects(subjectsResponse.subjects || []);
      setStaff(staffResponse.staff || []);
      setStudents(studentsResponse.students || []);
      setAssignmentForm((previous) => ({ ...previous, batch_id: previous.batch_id || batchesResponse.batches?.[0]?.batch_id || '' }));
      setStudentForm((previous) => ({ ...previous, batch_id: previous.batch_id || batchesResponse.batches?.[0]?.batch_id || '' }));
    } catch (requestError) {
      setError(requestError.message || 'Unable to load manager data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadManagerData(); }, []);

  const runAction = async (action) => {
    setSaving(true);
    setError('');
    try {
      await action();
      await loadManagerData();
    } catch (requestError) {
      setError(requestError.message || 'Unable to complete manager action.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading manager console...</div>;
  }

  if (error) {
    return (
      <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
        <AlertTriangle size={36} style={{ marginBottom: '0.75rem', color: '#fb7185' }} />
        <h2 style={{ fontSize: '1.2rem' }}>Manager console unavailable</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Manager Console</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Monitor batches, staff coverage, and student operations across the institute.
        </p>
      </div>

      <div className="stat-card-grid">
        <StatCard title="Active Batches" value={overview?.totalBatches || 0} subtext="Cohorts in the institute" icon={GraduationCap} color="#6366f1" />
        <StatCard title="Students" value={overview?.totalStudents || 0} subtext="Registered learners" icon={Users} color="#06b6d4" />
        <StatCard title="Trainers" value={overview?.totalTrainers || 0} subtext="Teaching staff" icon={BookOpen} color="#10b981" />
        <StatCard title="HR Members" value={overview?.totalHr || 0} subtext="Placement staff" icon={BriefcaseBusiness} color="#f59e0b" />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['batches', 'subjects', 'staff', 'assignments', 'students'].map((tab) => (
          <button key={tab} className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>
        ))}
      </div>

      {activeTab === 'batches' && <ManagerSection title="Batches">
        <form onSubmit={(event) => { event.preventDefault(); runAction(async () => { await api.createManagerBatch(batchForm); setBatchForm({ batch_code: '', course_name: '', start_date: '' }); }); }} style={formGrid}>
          <input className="form-input" placeholder="Batch code" value={batchForm.batch_code} onChange={(e) => setBatchForm({ ...batchForm, batch_code: e.target.value })} required />
          <input className="form-input" placeholder="Course name" value={batchForm.course_name} onChange={(e) => setBatchForm({ ...batchForm, course_name: e.target.value })} required />
          <input className="form-input" type="date" value={batchForm.start_date} onChange={(e) => setBatchForm({ ...batchForm, start_date: e.target.value })} />
          <button className="btn btn-primary" disabled={saving}><PlusCircle size={15} /> Add Batch</button>
        </form>
        <ItemList items={batches} renderItem={(batch) => <><strong>{batch.batch_code}</strong><span>{batch.course_name} · {batch.student_count || 0} students · {batch.trainers?.length || 0} trainers</span></>} />
      </ManagerSection>}

      {activeTab === 'subjects' && <ManagerSection title="Subjects">
        <form onSubmit={(event) => { event.preventDefault(); runAction(async () => { await api.createManagerSubject({ name: subjectName }); setSubjectName(''); }); }} style={formGrid}>
          <input className="form-input" placeholder="Subject or module name" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} required />
          <button className="btn btn-primary" disabled={saving}><PlusCircle size={15} /> Add Subject</button>
        </form>
        <ItemList items={subjects} renderItem={(subject) => <><strong>{subject.name}</strong><span>Subject ID: {subject.subject_id}</span></>} />
      </ManagerSection>}

      {activeTab === 'staff' && <ManagerSection title="Staff Accounts">
        <form onSubmit={(event) => { event.preventDefault(); runAction(async () => { await api.createManagerStaff(staffForm); setStaffForm({ ...staffForm, full_name: '', email: '' }); }); }} style={formGrid}>
          <input className="form-input" placeholder="Full name" value={staffForm.full_name} onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })} required />
          <input className="form-input" type="email" placeholder="Email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} required />
          <input className="form-input" placeholder="Temporary password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} required />
          <select className="form-select" value={staffForm.role} onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}><option value="TRAINER">Trainer</option><option value="HR">HR</option></select>
          <button className="btn btn-primary" disabled={saving}><UserPlus size={15} /> Create Staff</button>
        </form>
        <ItemList items={staff} renderItem={(person) => <><strong>{person.full_name}</strong><span>{person.role} · {person.email}</span></>} />
      </ManagerSection>}

      {activeTab === 'assignments' && <ManagerSection title="Trainer Assignments">
        <form onSubmit={(event) => { event.preventDefault(); runAction(() => api.assignTrainerToBatch(assignmentForm)); }} style={formGrid}>
          <select className="form-select" value={assignmentForm.batch_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, batch_id: e.target.value })} required><option value="">Select batch</option>{batches.map((batch) => <option key={batch.batch_id} value={batch.batch_id}>{batch.batch_code}</option>)}</select>
          <select className="form-select" value={assignmentForm.trainer_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, trainer_id: e.target.value })} required><option value="">Select trainer</option>{staff.filter((person) => person.role === 'TRAINER').map((person) => <option key={person.user_id} value={person.user_id}>{person.full_name}</option>)}</select>
          <select className="form-select" value={assignmentForm.subject_id} onChange={(e) => setAssignmentForm({ ...assignmentForm, subject_id: e.target.value })}><option value="">All subjects</option>{subjects.map((subject) => <option key={subject.subject_id} value={subject.subject_id}>{subject.name}</option>)}</select>
          <button className="btn btn-primary" disabled={saving}><UserPlus size={15} /> Assign Trainer</button>
        </form>
        <ItemList items={batches.flatMap((batch) => (batch.trainers || []).map((assignment) => ({ ...assignment, batch_code: batch.batch_code })))} renderItem={(assignment) => <><strong>{assignment.trainer_name}</strong><span>{assignment.batch_code} · {assignment.subject_name || 'All subjects'} <button className="btn btn-outline btn-sm" onClick={() => runAction(() => api.removeTrainerAssignment(assignment.assignment_id))}><UserMinus size={13} /> Remove</button></span></>} />
      </ManagerSection>}

      {activeTab === 'students' && <ManagerSection title="Students">
        <form onSubmit={(event) => { event.preventDefault(); runAction(async () => { await api.createManagerStudent({ ...studentForm, cgpa: Number(studentForm.cgpa || 0), passout_year: Number(studentForm.passout_year || 0) }); setStudentForm({ ...studentForm, full_name: '', email: '' }); }); }} style={formGrid}>
          <input className="form-input" placeholder="Full name" value={studentForm.full_name} onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })} required />
          <input className="form-input" type="email" placeholder="Email" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} required />
          <input className="form-input" placeholder="Password" value={studentForm.password} onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} required />
          <input className="form-input" type="number" step="0.01" placeholder="CGPA" value={studentForm.cgpa} onChange={(e) => setStudentForm({ ...studentForm, cgpa: e.target.value })} />
          <input className="form-input" type="number" placeholder="Passout year" value={studentForm.passout_year} onChange={(e) => setStudentForm({ ...studentForm, passout_year: e.target.value })} />
          <select className="form-select" value={studentForm.batch_id} onChange={(e) => setStudentForm({ ...studentForm, batch_id: e.target.value })} required><option value="">Select batch</option>{batches.map((batch) => <option key={batch.batch_id} value={batch.batch_id}>{batch.batch_code}</option>)}</select>
          <button className="btn btn-primary" disabled={saving}><UserPlus size={15} /> Add Student</button>
        </form>
        <ItemList items={students} renderItem={(student) => <><strong>{student.full_name}</strong><span>{student.email} · {student.batch_code || 'No batch'}</span></>} />
      </ManagerSection>}
    </div>
  );
}

const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem' };

function ManagerSection({ title, children }) {
  return <div className="glass-card" style={{ padding: '1.5rem' }}><h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>{title}</h2>{children}</div>;
}

function ItemList({ items, renderItem }) {
  if (!items.length) return <p style={{ color: 'var(--text-muted)' }}>No records found.</p>;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>{items.map((item, index) => <div key={item.assignment_id || item.user_id || item.subject_id || item.batch_id || index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', padding: '0.8rem 1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>{renderItem(item)}</div>)}</div>;
}
