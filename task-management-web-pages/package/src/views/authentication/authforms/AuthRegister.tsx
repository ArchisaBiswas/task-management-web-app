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

const AuthRegister = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [timezone, setTimezone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password || !timezone) return;
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
    <form className="mt-6" onSubmit={handleRegister}>
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
          required
        />
      </div>
      <div className="mb-4">
        <div className="mb-2 block">
          <Label htmlFor="emadd" className="font-semibold">Email Address</Label>
        </div>
        <Input
          id="emadd"
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="mb-4">
        <div className="mb-2 block">
          <Label htmlFor="userpwd" className="font-semibold">Password</Label>
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
      <div className="mb-6">
        <div className="mb-2 block">
          <Label htmlFor="timezone" className="font-semibold">Time Zone</Label>
        </div>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger id="timezone" className="w-full">
            <SelectValue placeholder="Select your time zone" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {timezones.map((tz) => (
              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
      <Button
        className="w-full"
        type="submit"
        disabled={loading || !name.trim() || !email.trim() || !password || !timezone}
      >
        {loading ? "Registering…" : "Register"}
      </Button>
    </form>
  );
};

export default AuthRegister;
