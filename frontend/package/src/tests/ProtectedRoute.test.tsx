import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import ProtectedRoute from 'src/components/ProtectedRoute';
import { AuthProvider } from 'src/context/AuthContext';

const renderWithRouter = (initialPath: string, isAuth: boolean) => {
  if (isAuth) {
    localStorage.setItem(
      'authUser',
      JSON.stringify({ user_id: 1, name: 'Admin', email: 'a@a.com', role: 'admin', timezone: 'UTC' })
    );
  } else {
    localStorage.removeItem('authUser');
  }

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Dashboard</div>
              </ProtectedRoute>
            }
          />
          <Route path="/auth/auth2/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
};

describe('ProtectedRoute', () => {
  it('renders children when user is authenticated', () => {
    renderWithRouter('/dashboard', true);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    renderWithRouter('/dashboard', false);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
