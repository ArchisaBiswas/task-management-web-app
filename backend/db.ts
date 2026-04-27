import mysql from "mysql2/promise";

// All four vars must be set — locally via backend/.env, in Docker via compose environment.
// The server fails fast at startup if any are missing rather than silently connecting to the wrong DB.
export const db = mysql.createPool({
  host:     process.env.DB_HOST!,
  user:     process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
});