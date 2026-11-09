import { Menu } from 'lucide-react';

// Top bar shown on phones and small tablets; the sidebar opens from its menu button
export default function Navbar({ onMenuClick }) {
  return (
    <header className="mobile-topbar">
      <button className="icon-btn light" onClick={onMenuClick} aria-label="Open navigation menu">
        <Menu size={22} />
      </button>
      <div className="brand-mini">
        <img src="/logo.svg" alt="" />
        <span>Sweety</span>
      </div>
    </header>
  );
}
