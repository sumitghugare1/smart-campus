import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Send, Users, User, MessageSquare, Clock } from 'lucide-react';

export default function ChatPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState('batch'); // 'batch' or 'dm'
  const [batchId, setBatchId] = useState(user?.batch_id || 1);
  const [messages, setMessages] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchContacts = async () => {
    try {
      const data = await api.getChatContacts();
      setContacts(data.contacts || []);
      if (data.contacts && data.contacts.length > 0 && !selectedContact) {
        setSelectedContact(data.contacts[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async () => {
    try {
      if (mode === 'batch') {
        const data = await api.getBatchMessages(batchId);
        setMessages(data.messages || []);
      } else if (selectedContact) {
        const data = await api.getDirectMessages(selectedContact.user_id);
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [mode, batchId, selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const payload = {
        body: newMessage.trim(),
        ...(mode === 'batch' ? { batch_id: batchId } : { receiver_id: selectedContact.user_id })
      };
      await api.sendMessage(payload);
      setNewMessage('');
      fetchMessages();
    } catch (err) {
      alert(`Message error: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', height: 'calc(85vh - 70px)' }}>
      {/* Sidebar: Channels & DMs */}
      <div className="glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Communication</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Live batch & trainer channels</p>
        </div>

        {/* Mode Selector */}
        <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(0,0,0,0.3)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
          <button
            className={`btn btn-sm ${mode === 'batch' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, fontSize: '0.75rem', padding: '0.35rem' }}
            onClick={() => setMode('batch')}
          >
            <Users size={12} /> Batch Group
          </button>
          <button
            className={`btn btn-sm ${mode === 'dm' ? 'btn-primary' : 'btn-outline'}`}
            style={{ flex: 1, fontSize: '0.75rem', padding: '0.35rem' }}
            onClick={() => setMode('dm')}
          >
            <User size={12} /> Direct Messages
          </button>
        </div>

        {mode === 'batch' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#ffffff' }}># BATCH-2026-FS</div>
              <div style={{ fontSize: '0.7rem', color: '#a5b4fc' }}>Full Stack Campus Group</div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Contacts
            </div>
            {contacts.map((c) => {
              const isSelected = selectedContact?.user_id === c.user_id;
              return (
                <div
                  key={c.user_id}
                  onClick={() => setSelectedContact(c)}
                  style={{
                    padding: '0.625rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#ffffff' }}>{c.full_name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{c.email}</div>
                  </div>
                  <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{c.role}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Chat Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
              {mode === 'batch' ? '# BATCH-2026-FS (Class Channel)' : `@ ${selectedContact?.full_name || 'Direct Message'}`}
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Live polling every 5s • Structured institutional communication
            </span>
          </div>
        </div>

        {/* Message Thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
              <p style={{ fontSize: '0.875rem' }}>No messages in this channel yet.</p>
              <p style={{ fontSize: '0.75rem' }}>Start the conversation!</p>
            </div>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user?.user_id;

              return (
                <div
                  key={m.message_id}
                  style={{
                    alignSelf: isMine ? 'flex-end' : 'flex-start',
                    maxWidth: '75%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isMine ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isMine ? '#c4b5fd' : '#ffffff' }}>
                      {m.sender_name || 'Member'}
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: '0.6rem' }}>
                      {m.sender_role}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: isMine ? 'linear-gradient(135deg, #4f46e5, #6366f1)' : '#1f2937',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      lineHeight: 1.4,
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {m.body}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '0.75rem' }}>
          <input
            id="chat-message-input"
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            placeholder={mode === 'batch' ? 'Message batch group...' : `Message ${selectedContact?.full_name || 'trainer'}...`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button
            id="btn-send-chat"
            type="submit"
            className="btn btn-primary"
            disabled={sending || !newMessage.trim()}
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
