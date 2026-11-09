import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';
import Loading from './Loading.jsx';

// Login and Register are only for signed-out users
export default function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <Loading fullPage message="Checking your session..." />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}
