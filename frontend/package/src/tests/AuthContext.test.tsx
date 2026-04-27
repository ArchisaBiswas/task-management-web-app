import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from 'src/context/AuthContext';

const TestConsumer = () => {
  const { isLoggedIn, user, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="logged-in">{String(isLoggedIn)}</span>
      <span data-testid="user-name">{user?.name ?? 'none'}</span>
      <button onClick={() => login({ user_id: 1, name: 'Alice', email: 'a@a.com', role: 'admin', timezone: 'UTC' })}>
        Login
      </button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

beforeEach(() => {
  localStorage.clear();
});

describe('AuthContext', () => {
  it('starts logged out when localStorage is empty', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('logged-in').textContent).toBe('false');
    expect(screen.getByTestId('user-name').textContent).toBe('none');
  });

  it('restores session from localStorage on mount', () => {
    const stored = { user_id: 99, name: 'Bob', email: 'b@b.com', role: 'assignee', timezone: 'UTC' };
    localStorage.setItem('authUser', JSON.stringify(stored));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('logged-in').textContent).toBe('true');
    expect(screen.getByTestId('user-name').textContent).toBe('Bob');
  });

  it('logs in and persists to localStorage', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('logged-in').textContent).toBe('true');
    expect(screen.getByTestId('user-name').textContent).toBe('Alice');
    expect(JSON.parse(localStorage.getItem('authUser')!).name).toBe('Alice');
  });

  it('logs out and clears localStorage', () => {
    localStorage.setItem(
      'authUser',
      JSON.stringify({ user_id: 1, name: 'Alice', email: 'a@a.com', role: 'admin', timezone: 'UTC' })
    );

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    act(() => {
      screen.getByText('Logout').click();
    });

    expect(screen.getByTestId('logged-in').textContent).toBe('false');
    expect(localStorage.getItem('authUser')).toBeNull();
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    const OriginalError = console.error;
    console.error = () => {};
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used inside AuthProvider');
    console.error = OriginalError;
  });
});
