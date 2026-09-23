import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Bell, CheckCheck, X, Briefcase, Award, Calendar, ExternalLink } from 'lucide-react';

export default function NotificationDrawer({ isOpen, onClose, onSelectJob }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // 5-second polling for live updates as specified in Section 5
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClickItem = async (item) => {
    if (!item.is_read) {
      api.markNotificationRead(item.notification_id).catch(() => {});
      setNotifications(prev => prev.map(n => n.notification_id === item.notification_id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (item.job_id && onSelectJob) {
      onSelectJob(item.job_id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          height: '100vh',
          maxHeight: '100vh',
          borderRadius: 0,
          borderLeft: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} className="text-indigo-400" />
            <h3 style={{ fontSize: '1rem' }}>Notifications</h3>
            {unreadCount > 0 && (
              <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                {unreadCount} new
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {unreadCount > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={handleMarkAllRead}
                title="Mark all as read"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
            <button className="btn btn-outline btn-sm" onClick={onClose} style={{ padding: '0.25rem 0.5rem' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <Bell size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.875rem' }}>No notifications yet</p>
              <p style={{ fontSize: '0.75rem' }}>Eligible campus drives and status updates will appear here</p>
            </div>
          ) : (
            notifications.map((item) => {
              const isUnread = !item.is_read;
              return (
                <div
                  key={item.notification_id}
                  onClick={() => handleClickItem(item)}
                  style={{
                    padding: '0.875rem',
                    borderRadius: 'var(--radius-md)',
                    background: isUnread ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                    border: isUnread ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid var(--border-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    position: 'relative',
                    transition: 'all 0.15s ease'
                  }}
                  className="glass-card-interactive"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.type === 'NEW_JOB' ? (
                        <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Drive Alert</span>
                      ) : item.type === 'STATUS_UPDATE' ? (
                        <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>Pipeline</span>
                      ) : item.type === 'MOCK_SCORE' ? (
                        <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Evaluation</span>
                      ) : (
                        <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Update</span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {isUnread && (
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#6366f1', display: 'inline-block'
                      }} />
                    )}
                  </div>

                  <h4 style={{ fontSize: '0.875rem', color: isUnread ? '#ffffff' : 'var(--text-primary)' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {item.body}
                  </p>

                  {item.job_id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--primary)' }}>
                      <span>View requirements & apply</span>
                      <ExternalLink size={12} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
