import { useEffect, useState } from 'react';
import { CalendarDays, LogOut, Mail, UserRound } from 'lucide-react';
import Loading from '../components/Loading.jsx';
import useAuth from '../hooks/useAuth.js';
import { authAPI } from '../services/authAPI.js';
import { getErrorMessage } from '../services/api.js';
import { formatLongDate } from '../utils/dateUtils.js';

export default function Profile() {
  const { logout } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    authAPI
      .me()
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err, 'Could not load your profile.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Loading message="Loading profile..." />;

  const initials = (user?.name || 'U')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="page profile-page">
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p className="page-subtitle">Your account details.</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {user && (
        <section className="card profile-card">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-details">
            <div className="profile-row">
              <UserRound size={18} />
              <div>
                <span className="muted">Full name</span>
                <strong>{user.name}</strong>
              </div>
            </div>
            <div className="profile-row">
              <Mail size={18} />
              <div>
                <span className="muted">Email</span>
                <strong>{user.email}</strong>
              </div>
            </div>
            <div className="profile-row">
              <CalendarDays size={18} />
              <div>
                <span className="muted">Member since</span>
                <strong>{formatLongDate(user.createdAt)}</strong>
              </div>
            </div>
            <button
              className="btn btn-danger profile-logout"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                await logout();
              }}
            >
              <LogOut size={18} /> {loggingOut ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
