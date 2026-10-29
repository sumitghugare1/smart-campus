import React, { useState } from 'react';
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  FileText,
  Hash,
  LayoutGrid,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const primaryNav = [
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'teams', label: 'Teams', icon: Users },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'files', label: 'Files', icon: FileText },
];

const workspaceTeams = [
  {
    name: 'Placement Operations',
    color: '#8b5cf6',
    channels: ['General', 'Announcements', 'Campus drives'],
  },
  {
    name: 'Engineering Cohort',
    color: '#14b8a6',
    channels: ['General', 'Interview prep', 'Resources'],
  },
  {
    name: 'People & Culture',
    color: '#f59e0b',
    channels: ['General', 'Onboarding'],
  },
];

export default function WorkspaceShell({ activePage, onNavigate, onOpenNotifications, children }) {
  const { user, logout } = useAuth();
  const [activeChannel, setActiveChannel] = useState('General');
  const [expandedTeams, setExpandedTeams] = useState(workspaceTeams.map((team) => team.name));

  const toggleTeam = (teamName) => {
    setExpandedTeams((current) => current.includes(teamName)
      ? current.filter((name) => name !== teamName)
      : [...current, teamName]);
  };

  const navigate = (page) => onNavigate(page);

  return (
    <div className="workspace-app">
      <aside className="workspace-rail" aria-label="Workspace navigation">
        <div className="workspace-mark">Q</div>
        <button className="rail-button rail-button-active" aria-label="Workspace home" onClick={() => navigate('dashboard')}>
          <LayoutGrid size={19} />
        </button>
        <button className="rail-button" aria-label="Activity" onClick={() => navigate('activity')}>
          <Activity size={19} />
        </button>
        <button className="rail-button" aria-label="Chat" onClick={() => navigate('chat')}>
          <MessageCircle size={19} />
        </button>
        <button className="rail-button" aria-label="Teams" onClick={() => navigate('teams')}>
          <Users size={19} />
        </button>
        <div className="rail-spacer" />
        <button className="rail-button" aria-label="Settings" onClick={() => navigate('manager')}>
          <Settings size={19} />
        </button>
        <button className="rail-avatar" aria-label="Account menu" onClick={logout}>{user?.full_name?.charAt(0) || 'U'}</button>
      </aside>

      <aside className="workspace-sidebar">
        <div className="workspace-selector">
          <div className="workspace-logo">S</div>
          <div className="workspace-selector-copy">
            <strong>Smart Campus</strong>
            <span>Product workspace</span>
          </div>
          <ChevronDown size={16} />
        </div>

        <button className="workspace-search" onClick={() => navigate('chat')}>
          <Search size={15} />
          <span>Search workspace</span>
          <kbd>⌘ K</kbd>
        </button>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Workspace</div>
          {primaryNav.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`sidebar-nav-item ${activePage === id ? 'active' : ''}`} onClick={() => navigate(id)}>
              <Icon size={17} />
              <span>{label}</span>
              {id === 'activity' && <span className="nav-count">4</span>}
            </button>
          ))}
        </div>

        <div className="sidebar-section teams-section">
          <div className="sidebar-section-heading">
            <span className="sidebar-section-label">Teams</span>
            <button className="icon-button" aria-label="Add a team"><Plus size={15} /></button>
          </div>
          {workspaceTeams.map((team) => {
            const isExpanded = expandedTeams.includes(team.name);
            return (
              <div className="team-group" key={team.name}>
                <button className="team-heading" onClick={() => toggleTeam(team.name)}>
                  <ChevronDown size={14} className={isExpanded ? '' : 'collapsed-chevron'} />
                  <span className="team-dot" style={{ background: team.color }} />
                  <span>{team.name}</span>
                  <MoreHorizontal size={15} className="team-more" />
                </button>
                {isExpanded && (
                  <div className="channel-list">
                    {team.channels.map((channel) => (
                      <button key={channel} className={`channel-item ${activeChannel === channel ? 'active' : ''}`} onClick={() => { setActiveChannel(channel); navigate('chat'); }}>
                        <Hash size={14} />
                        <span>{channel}</span>
                        {channel === 'Announcements' && <span className="channel-alert" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <button className="add-team-button"><Plus size={15} /> Add or join a team</button>
        </div>

        <div className="sidebar-footer-card">
          <Sparkles size={16} />
          <div><strong>Make it yours</strong><span>Customize this workspace for your organization.</span></div>
          <button aria-label="Open customization settings" onClick={() => navigate('manager')}><ChevronDown size={14} /></button>
        </div>
      </aside>

      <section className="workspace-content">
        <header className="workspace-topbar">
          <div className="breadcrumb"><span>Smart Campus</span><span>/</span><strong>{activePage === 'chat' ? activeChannel : (activePage || 'Overview')}</strong></div>
          <div className="topbar-actions">
            <button className="topbar-action" onClick={onOpenNotifications}><Bell size={17} /><span>Notifications</span><i>3</i></button>
            <div className="user-menu"><div className="user-avatar">{user?.full_name?.charAt(0) || 'U'}</div><div><strong>{user?.full_name?.split(' ')[0] || 'User'}</strong><span>{user?.role || 'Member'}</span></div><ChevronDown size={15} /></div>
          </div>
        </header>
        <main className="workspace-main">{children}</main>
      </section>
    </div>
  );
}
