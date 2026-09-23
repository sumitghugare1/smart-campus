import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  MessageSquare,
  Briefcase,
  BookOpen,
  Award,
  BarChart3,
  CalendarCheck,
  CheckCircle,
  Bell,
  LogOut,
  User,
  PlusCircle,
  KanbanSquare,
  Settings2
} from 'lucide-react';

export default function Navbar({ activePage, onNavigate, onOpenNotifications }) {
  const { user, logout, isStudent, isHr, isTrainer, isAdmin, isManager } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function loadNotifCount() {
      try {
        const data = await api.getNotifications();
        setUnreadCount(data.unreadCount || 0);
      } catch (e) {}
    }
    loadNotifCount();
    const timer = setInterval(loadNotifCount, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="navbar">
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <a href="#dashboard" onClick={(e) => { e.preventDefault(); onNavigate('dashboard'); }} className="navbar-brand">
          <div className="brand-icon">
            <MessageSquare size={20} color="#ffffff" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>QTalk</span>
              <span className="brand-badge">NextGen</span>
            </div>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.02em' }}>
              Campus Placement OS
            </span>
          </div>
        </a>
      </div>

      {/* Nav items */}
      <nav className="navbar-links">
        <button
          className={`nav-link ${activePage === 'dashboard' ? 'active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          <Briefcase size={16} />
          <span>Dashboard</span>
        </button>

        <button
          className={`nav-link ${activePage === 'jobs' ? 'active' : ''}`}
          onClick={() => onNavigate('jobs')}
        >
          <Award size={16} />
          <span>Campus Drives</span>
        </button>

        {isStudent && (
          <button
            className={`nav-link ${activePage === 'applications' ? 'active' : ''}`}
            onClick={() => onNavigate('applications')}
          >
            <CheckCircle size={16} />
            <span>My Applications</span>
          </button>
        )}

        {isHr && (
          <>
            <button
              className={`nav-link ${activePage === 'create-job' ? 'active' : ''}`}
              onClick={() => onNavigate('create-job')}
            >
              <PlusCircle size={16} />
              <span>Post Drive</span>
            </button>
            <button
              className={`nav-link ${activePage === 'pipeline' ? 'active' : ''}`}
              onClick={() => onNavigate('pipeline')}
            >
              <KanbanSquare size={16} />
              <span>Pipeline Kanban</span>
            </button>
          </>
        )}

        {isTrainer && (
          <button
            className={`nav-link ${activePage === 'trainer' ? 'active' : ''}`}
            onClick={() => onNavigate('trainer')}
          >
            <CalendarCheck size={16} />
            <span>Attendance & Mocks</span>
          </button>
        )}

        {(isManager || isAdmin) && (
          <button
            className={`nav-link ${activePage === 'manager' ? 'active' : ''}`}
            onClick={() => onNavigate('manager')}
          >
            <Settings2 size={16} />
            <span>Manager Console</span>
          </button>
        )}

        {(isAdmin || isHr) && (
          <button
            className={`nav-link ${activePage === 'analytics' ? 'active' : ''}`}
            onClick={() => onNavigate('analytics')}
          >
            <BarChart3 size={16} />
            <span>Analytics</span>
          </button>
        )}

        <button
          className={`nav-link ${activePage === 'chat' ? 'active' : ''}`}
          onClick={() => onNavigate('chat')}
        >
          <MessageSquare size={16} />
          <span>Batch Chat</span>
        </button>

        <button
          className={`nav-link ${activePage === 'resources' ? 'active' : ''}`}
          onClick={() => onNavigate('resources')}
        >
          <BookOpen size={16} />
          <span>Resources</span>
        </button>

        <button
          className={`nav-link ${activePage === 'interviews' ? 'active' : ''}`}
          onClick={() => onNavigate('interviews')}
        >
          <Award size={16} />
          <span>Interview Bank</span>
        </button>
      </nav>

      {/* Actions */}
      <div className="navbar-actions">
        {/* Notification Bell */}
        <button
          id="btn-navbar-notifications"
          className="btn btn-outline"
          onClick={onOpenNotifications}
          style={{ position: 'relative', padding: '0.5rem', borderRadius: '50%' }}
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                background: '#f43f5e',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                width: 18,
                height: 18,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(244, 63, 94, 0.6)'
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Role Badge & Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
              {user?.full_name?.split(' ')[0]}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {user?.role}
            </div>
          </div>

          <span
            className={`badge ${
              user?.role === 'HR'
                ? 'badge-purple'
                : user?.role === 'TRAINER'
                ? 'badge-info'
                : user?.role === 'MANAGER'
                ? 'badge-warning'
                : user?.role === 'ADMIN'
                ? 'badge-warning'
                : 'badge-success'
            }`}
          >
            {user?.role}
          </span>
        </div>

        {/* Logout */}
        <button
          id="btn-navbar-logout"
          className="btn btn-outline btn-sm"
          onClick={logout}
          title="Sign out"
          style={{ padding: '0.4rem 0.6rem' }}
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
