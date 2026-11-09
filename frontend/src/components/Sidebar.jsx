import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, LayoutDashboard, ListChecks, LogOut, UserRound, X } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/readings', label: 'Readings', icon: ListChecks },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = (user?.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    setLoggingOut(true);
    // ProtectedRoute redirects to /login once the user is cleared
    await logout();
  };

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand">
            <img src="/logo.svg" alt="" />
            <span>Sweety</span>
          </div>
          <button className="icon-btn light sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="sidebar-user-text">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="nav-link logout-btn" onClick={handleLogout} disabled={loggingOut}>
          <LogOut size={20} />
          <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
        </button>
      </aside>
    </>
  );
}
