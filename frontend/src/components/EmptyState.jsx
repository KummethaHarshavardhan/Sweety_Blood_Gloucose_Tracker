import { Inbox } from 'lucide-react';

export default function EmptyState({ title, text, children }) {
  return (
    <div className="empty-state">
      <Inbox size={36} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}
