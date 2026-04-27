import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { useAuth } from 'src/context/AuthContext';

// Basic format check — trims whitespace before testing to avoid false negatives from copy-paste.
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

// Login form with lazy validation (errors shown only after a field is blurred or submit attempted).
const AuthLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  // Marks a field as interacted with so its error message becomes visible.
  const touch = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const emailError =
    touched.email && (!email.trim() ? 'E-Mail is required' : !isValidEmail(email) ? 'Please enter a valid E-Mail Address' : '');
  const passwordError =
    touched.password && (!password ? 'Password is required' : password.length < 6 ? 'Password must be at least 6 characters' : '');

  // Submits credentials to the backend and redirects based on role:
  // admins go to the dashboard, regular users go to /all-tasks.
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!email.trim() || !isValidEmail(email) || !password || password.length < 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        setError('Invalid email or password. Please try again.');
        return;
      }
      const userData = await res.json();
      login(userData);
      navigate(userData.role === 'admin' ? '/dashboard' : '/all-tasks');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="mt-6" onSubmit={handleSignIn} noValidate>
      <div className="mb-4">
        <div className="mb-2 block">
          <Label htmlFor="username">Email</Label>
        </div>
        <Input
          id="username"
          type="email"
          placeholder="Enter your E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => touch('email')}
          className={emailError ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
      </div>
      <div className="mb-4">
        <div className="mb-2 block">
          <Label htmlFor="userpwd">Password</Label>
        </div>
        <Input
          id="userpwd"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => touch('password')}
          className={passwordError ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
      </div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
};

export default AuthLogin;
