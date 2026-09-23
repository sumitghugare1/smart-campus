import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import NotificationDrawer from './components/NotificationDrawer';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import HrDashboard from './pages/HrDashboard';
import TrainerDashboard from './pages/TrainerDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import JobsPage from './pages/JobsPage';
import JobDetailsPage from './pages/JobDetailsPage';
import MyApplicationsPage from './pages/MyApplicationsPage';
import CreateJobPage from './pages/CreateJobPage';
import ChatPage from './pages/ChatPage';
import ResourcesPage from './pages/ResourcesPage';
import InterviewBankPage from './pages/InterviewBankPage';

function MainApp() {
  const { user, loading, isStudent, isHr, isTrainer, isAdmin, isManager } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#c4b5fd' }}>Loading QTalk NextGen...</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Initializing relational database models
          </div>
        </div>
      </div>
    );
  }

  // Not logged in: Show Login or Register
  if (!user) {
    return (
      <div className="app-container">
        <main className="main-content">
          {authView === 'login' ? (
            <Login onNavigateToRegister={() => setAuthView('register')} />
          ) : (
            <Register onNavigateToLogin={() => setAuthView('login')} />
          )}
        </main>
      </div>
    );
  }

  const handleSelectJob = (jobId) => {
    setSelectedJobId(jobId);
    setActivePage('job-detail');
  };

  const renderDashboardByRole = () => {
    if (isStudent) {
      return (
        <StudentDashboard
          onNavigate={(page) => setActivePage(page)}
          onSelectJob={handleSelectJob}
        />
      );
    }
    if (isHr) {
      return (
        <HrDashboard
          onNavigateToCreate={() => setActivePage('create-job')}
        />
      );
    }
    if (isTrainer) {
      return <TrainerDashboard />;
    }
    if (isManager) {
      return <ManagerDashboard />;
    }
    if (isAdmin) {
      return <AdminAnalyticsPage />;
    }
    return <JobsPage onSelectJob={handleSelectJob} />;
  };

  return (
    <div className="app-container">
      {/* Modern Navigation Header */}
      <Navbar
        activePage={activePage}
        onNavigate={(page) => setActivePage(page)}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />

      {/* Main Page Content */}
      <main className="main-content">
        {activePage === 'dashboard' && renderDashboardByRole()}

        {activePage === 'jobs' && (
          <JobsPage
            onSelectJob={handleSelectJob}
            onNavigateToCreate={() => setActivePage('create-job')}
          />
        )}

        {activePage === 'job-detail' && (
          <JobDetailsPage
            jobId={selectedJobId}
            onBack={() => setActivePage('jobs')}
            onNavigateToPipeline={() => setActivePage('dashboard')}
          />
        )}

        {activePage === 'applications' && (
          <MyApplicationsPage onNavigateToJobs={() => setActivePage('jobs')} />
        )}

        {activePage === 'create-job' && (
          <CreateJobPage
            onBack={() => setActivePage('dashboard')}
            onSuccess={() => setActivePage('dashboard')}
          />
        )}

        {activePage === 'pipeline' && (
          <HrDashboard onNavigateToCreate={() => setActivePage('create-job')} />
        )}

        {activePage === 'trainer' && <TrainerDashboard />}

        {activePage === 'manager' && <ManagerDashboard />}

        {activePage === 'analytics' && <AdminAnalyticsPage />}

        {activePage === 'chat' && <ChatPage />}

        {activePage === 'resources' && <ResourcesPage />}

        {activePage === 'interviews' && <InterviewBankPage />}
      </main>

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onSelectJob={handleSelectJob}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
