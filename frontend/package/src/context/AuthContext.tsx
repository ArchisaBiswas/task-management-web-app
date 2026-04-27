import { createContext, useContext, useState, ReactNode } from 'react';

export type AuthUser = {
  user_id: number;
  name: string;
  email: string;
  role: string;
  timezone: string;
};

interface AuthContextType {
  isLoggedIn: boolean;
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Hydrates auth state from localStorage on mount so users stay logged in across page refreshes.
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('authUser');
    return stored ? JSON.parse(stored) : null;
  });

  // Persists the authenticated user to localStorage so the session survives a browser reload.
  const login = (userData: AuthUser) => {
    localStorage.setItem('authUser', JSON.stringify(userData));
    setUser(userData);
  };

  // Clears the persisted session and resets in-memory state, forcing a redirect to login.
  const logout = () => {
    localStorage.removeItem('authUser');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn: user !== null, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook that guards against usage outside of AuthProvider and exposes the auth API.
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
