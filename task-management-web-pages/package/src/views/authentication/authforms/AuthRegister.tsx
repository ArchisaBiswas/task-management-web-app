import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";

const timezones = [
  "Pacific/Midway",
  "Pacific/Honolulu",
  "America/Anchorage",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Caracas",
  "America/Halifax",
  "America/Sao_Paulo",
  "Atlantic/South_Georgia",
  "Atlantic/Azores",
  "Europe/London",
  "Europe/Paris",
  "Europe/Helsinki",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Karachi",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const AuthRegister = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [timezone, setTimezone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
    timezone: false,
  });

  const touch = (field: keyof typeof touched) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  const nameError = touched.name && !name.trim() ? 'Name is required' : '';
  const emailError =
    touched.email && (!email.trim() ? 'E-Mail is required' : !isValidEmail(email) ? 'Please enter a valid E-Mail Address' : '');
  const passwordError =
    touched.password && (!password ? 'Password is required' : password.length < 8 ? 'Password must be at least 8 characters' : '');
  const confirmPasswordError =
    touched.confirmPassword && (!confirmPassword ? 'Please confirm your password' : confirmPassword !== password ? 'Passwords do not match' : '');
  const timezoneError = touched.timezone && !timezone ? 'Please select a timezone' : '';

  const isFormValid =
    name.trim() &&
    isValidEmail(email) &&
    password.length >= 8 &&
    confirmPassword === password &&
    timezone;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true, timezone: true });
    if (!isFormValid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password, timezone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed.");
        return;
      }
      navigate("/auth/auth2/login");
    } catch {
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="mt-6" onSubmit={handleRegister} noValidate>
      <div className="mb-4">
        <div className="mb-2 block">
          <Label htmlFor="name" className="font-semibold">Name</Label>
        </div>
        <Input
          id="name"
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => touch('name')}
          className={nameError ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
      </div>
      <div className="mb-4">
        <div className="mb-2 block">
          <Label htmlFor="emadd" className="font-semibold">E-Mail Address</Label>
        </div>
        <Input
          id="emadd"
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
          <Label htmlFor="userpwd" className="font-semibold">Password</Label>
        </div>
        <Input
          id="userpwd"
          type="password"
          placeholder="Enter your password (min. 8 characters)"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (touched.confirmPassword) touch('confirmPassword');
          }}
          onBlur={() => touch('password')}
          className={passwordError ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {passwordError && <p className="text-xs text-red-500 mt-1">{passwordError}</p>}
      </div>
      <div className="mb-4">
        <div className="mb-2 block">
          <Label htmlFor="confirmpwd" className="font-semibold">Confirm Password</Label>
        </div>
        <Input
          id="confirmpwd"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => touch('confirmPassword')}
          className={confirmPasswordError ? 'border-red-500 focus-visible:ring-red-500' : ''}
        />
        {confirmPasswordError && <p className="text-xs text-red-500 mt-1">{confirmPasswordError}</p>}
      </div>
      <div className="mb-6">
        <div className="mb-2 block">
          <Label htmlFor="timezone" className="font-semibold">Time Zone</Label>
        </div>
        <Select
          value={timezone}
          onValueChange={(val) => { setTimezone(val); touch('timezone'); }}
        >
          <SelectTrigger
            id="timezone"
            className={`w-full ${timezoneError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            onBlur={() => touch('timezone')}
          >
            <SelectValue placeholder="Select your time zone" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {timezoneError && <p className="text-xs text-red-500 mt-1">{timezoneError}</p>}
      </div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      <Button
        className="w-full"
        type="submit"
        disabled={loading}
      >
        {loading ? "Registering…" : "Register"}
      </Button>
    </form>
  );
};

export default AuthRegister;
