import React from 'react';
import { ArrowUpRight, CalendarDays, CheckCircle2, FileText, MessageCircle, Users } from 'lucide-react';

const updates = [
  { icon: MessageCircle, color: '#7c5cff', title: 'New message in #General', detail: 'Aarav shared an update with Placement Operations', time: '12 min ago' },
  { icon: FileText, color: '#2d806f', title: 'Placement playbook.pdf was updated', detail: 'Priya Shah added the final recruiter checklist', time: '38 min ago' },
  { icon: CalendarDays, color: '#e0a43a', title: 'Campus drive added to calendar', detail: 'Acme Technologies · Thursday at 4:00 PM', time: '1 hr ago' },
  { icon: Users, color: '#ef6b73', title: 'You joined Engineering Cohort', detail: 'You can now access its channels and shared files', time: 'Yesterday' },
];

const files = [
  ['Placement playbook.pdf', 'PDF · 2.4 MB', 'Priya Shah'],
  ['September drives.xlsx', 'Spreadsheet · 184 KB', 'Rahul Verma'],
  ['Interview preparation resources', 'Folder · 18 items', 'Engineering Cohort'],
  ['Communication guidelines.docx', 'Document · 420 KB', 'People & Culture'],
];

export function ActivityOverview() {
  return <OverviewFrame eyebrow="Your workspace" title="Activity" description="Catch up on conversations, files, and decisions across Smart Campus."><div className="overview-list">{updates.map(({ icon: Icon, color, title, detail, time }) => <article className="activity-row" key={title}><div className="activity-icon" style={{ color, background: `${color}18` }}><Icon size={17} /></div><div className="activity-copy"><strong>{title}</strong><span>{detail}</span></div><time>{time}</time></article>)}</div></OverviewFrame>;
}

export function FilesOverview() {
  return <OverviewFrame eyebrow="Workspace library" title="Files" description="Shared resources from teams and channels, organized for everyone to find."><div className="files-grid">{files.map(([name, meta, owner]) => <article className="file-card" key={name}><div className="file-card-icon"><FileText size={18} /></div><strong>{name}</strong><span>{meta}</span><small>Owned by {owner}</small><button>Open <ArrowUpRight size={14} /></button></article>)}</div></OverviewFrame>;
}

function OverviewFrame({ eyebrow, title, description, children }) {
  return <div className="workspace-overview"><div className="overview-header"><div><div className="eyebrow"><CheckCircle2 size={14} /> {eyebrow}</div><h1>{title}</h1><p>{description}</p></div><button className="secondary-action"><ArrowUpRight size={15} /> View all</button></div>{children}</div>;
}
