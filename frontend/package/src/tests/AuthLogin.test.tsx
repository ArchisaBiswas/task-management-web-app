import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router';
import AuthLogin from 'src/views/authentication/authforms/AuthLogin';
import { AuthProvider } from 'src/context/AuthContext';

const renderLogin = () =>
  render(
    <AuthProvider>
      <MemoryRouter>
        <AuthLogin />
      </MemoryRouter>
    </AuthProvider>
  );

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('AuthLogin', () => {
  it('renders email and password fields and a submit button', () => {
    renderLogin();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    renderLogin();
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('E-Mail is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('shows invalid email error for bad email format', async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'notanemail' } });
    fireEvent.blur(screen.getByLabelText('Email'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid E-Mail Address')).toBeInTheDocument();
    });
  });

  it('shows password length error for short password', async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '123' } });
    fireEvent.blur(screen.getByLabelText('Password'));

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('shows error message on invalid credentials', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });

    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('shows error message on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));

    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText(/login failed/i)).toBeInTheDocument();
    });
  });

  it('calls login and navigates on successful sign-in', async () => {
    const userData = { user_id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin', timezone: 'UTC' };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => userData,
    });

    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'admin@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('authUser')!).name).toBe('Admin');
    });
  });

  it('disables the button while signing in', async () => {
    let resolveFetch!: (v: unknown) => void;
    global.fetch = vi.fn().mockReturnValueOnce(new Promise((r) => (resolveFetch = r)));

    renderLogin();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'user@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });

    resolveFetch({ ok: false });
  });
});
