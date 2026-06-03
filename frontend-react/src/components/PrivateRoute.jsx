import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Spinner from './Spinner';
import { ROUTES } from '../config/routes';

export default function PrivateRoute({ children, adminOnly = false }) {
  const { isLogin, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <Spinner />;
  if (!isLogin) return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to={ROUTES.HOME} replace />;

  return children;
}
