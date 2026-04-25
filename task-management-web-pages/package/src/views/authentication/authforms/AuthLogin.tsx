import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from 'src/components/ui/button';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { useAuth } from 'src/context/AuthContext';

const AuthLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        setError('User not found. Please check your email.');
        return;
      }
      const userData = await res.json();
      login(userData);
      navigate(userData.role === 'admin' ? '/' : '/all-tasks');
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="mt-6" onSubmit={handleSignIn}>
      <div className="mb-4">
        <div className="mb-2 block">
          <Label htmlFor="username">Email</Label>
        </div>
        <Input
          id="username"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
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
          required
        />
      </div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
};

export default AuthLogin;
