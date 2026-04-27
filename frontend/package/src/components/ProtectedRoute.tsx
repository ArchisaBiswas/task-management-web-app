import { Navigate } from 'react-router';
import { useAuth } from 'src/context/AuthContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/auth/auth2/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
