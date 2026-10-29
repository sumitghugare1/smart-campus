import React, { useState } from 'react';
import { Bell, CheckCircle2, FileText, Hash, MessageSquare, MoreHorizontal, Paperclip, Pin, Plus, Search, Send, Users } from 'lucide-react';

const channelData = {
  General: {
    description: 'A shared space for the whole Placement Operations team.',
    members: 48,
    messages: [
      { author: 'Aarav Mehta', initials: 'AM', color: '#7c5cff', time: '9:42 AM', text: 'Welcome to the new Placement Operations workspace. Use this channel for updates that everyone needs to see.' },
      { author: 'Priya Shah', initials: 'PS', color: '#e0a43a', time: '10:08 AM', text: 'The campus drive calendar is now updated with the September hiring partners.' },
      { author: 'You', initials: 'YU', color: '#2d806f', time: '10:16 AM', text: 'I\'ll share the interview preparation resources here before lunch.' },
    ],
  },
  Announcements: {
    description: 'Important news and updates from workspace admins.',
    members: 48,
    messages: [{ author: 'Nisha Kapoor', initials: 'NK', color: '#ef6b73', time: 'Yesterday', text: 'New organization guidelines are live. Please review the updated communication policy.' }],
  },
  'Campus drives': {
    description: 'Coordinate upcoming hiring drives and recruiter visits.',
    members: 22,
    messages: [{ author: 'Rahul Verma', initials: 'RV', color: '#3ea3d8', time: 'Monday', text: 'Acme Technologies has confirmed their pre-placement talk for Thursday at 4:00 PM.' }],
  },
};

export default function TeamWorkspace({ channel = 'General' }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(channelData[channel]?.messages || channelData.General.messages);
  const activeChannel = channelData[channel] ? channel : 'General';

  const sendMessage = (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    setMessages((current) => [...current, { author: 'You', initials: 'YU', color: '#2d806f', time: 'Just now', text: message.trim() }]);
    setMessage('');
  };

  return (
    <div className="team-workspace">
      <div className="team-workspace-header">
        <div>
          <div className="eyebrow"><Hash size={14} /> Placement Operations</div>
          <h1>{activeChannel}</h1>
          <p>{channelData[activeChannel].description}</p>
        </div>
        <div className="team-header-actions">
          <button className="secondary-action"><Users size={15} /> {channelData[activeChannel].members}</button>
          <button className="secondary-action"><Pin size={15} /> Pinned</button>
          <button className="icon-button" aria-label="More channel options"><MoreHorizontal size={18} /></button>
        </div>
      </div>

      <div className="team-workspace-grid">
        <section className="conversation-panel">
          <div className="conversation-toolbar"><span>Channel conversation</span><button className="subtle-button"><Search size={14} /> Search</button></div>
          <div className="message-list">
            {messages.map((item, index) => (
              <article className="workspace-message" key={`${item.author}-${item.time}-${index}`}>
                <div className="message-avatar" style={{ background: item.color }}>{item.initials}</div>
                <div className="message-body"><div className="message-meta"><strong>{item.author}</strong><span>{item.time}</span></div><p>{item.text}</p></div>
              </article>
            ))}
          </div>
          <form className="message-composer" onSubmit={sendMessage}>
            <input aria-label="Post a message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder={`Message #${activeChannel}`} />
            <button type="button" aria-label="Attach a file"><Paperclip size={17} /></button>
            <button className="send-button" type="submit" aria-label="Send message"><Send size={16} /></button>
          </form>
        </section>

        <aside className="channel-details">
          <div className="details-heading"><strong>Channel details</strong><button className="icon-button" aria-label="Close details"><MoreHorizontal size={16} /></button></div>
          <div className="details-card"><div className="details-icon"><CheckCircle2 size={18} /></div><div><strong>Keep everyone aligned</strong><p>Share updates, files, and decisions in one searchable place.</p></div></div>
          <div className="details-section"><span className="details-label">Shared files</span><div className="file-row"><FileText size={16} /><div><strong>Placement playbook.pdf</strong><span>Updated today</span></div></div><div className="file-row"><FileText size={16} /><div><strong>September drives.xlsx</strong><span>Updated yesterday</span></div></div><button className="text-action"><Plus size={14} /> Add a file</button></div>
          <div className="details-section"><span className="details-label">Members</span><div className="member-stack"><span className="member-bubble">AM</span><span className="member-bubble">PS</span><span className="member-bubble">NK</span><span className="member-bubble more">+45</span></div></div>
        </aside>
      </div>
    </div>
  );
}
