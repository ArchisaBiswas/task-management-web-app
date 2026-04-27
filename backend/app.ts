import "dotenv/config";
import express from "express";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { sendTaskAssignmentEmail } from "./ses-email";

const app = express();
app.use(express.json());

// Allows the React dev server (different port) and any other origin to call this API.
// OPTIONS pre-flight is answered with 204 so browsers don't block PATCH/DELETE.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
  'Access-Control-Allow-Methods',
  'GET, POST, PATCH, DELETE, OPTIONS'
    );
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Returns every task assignment joined with user and task details, ordered by user then due date.
app.get("/assignments", async (_req, res) => {
  try {
    const query = `
      SELECT
        t.task_id,
        u.user_id,
        u.name,
        u.timezone,
        t.task_name,
        t.due_date,
        t.priority,
        ta.status
      FROM users u
      JOIN task_assignments ta ON u.user_id = ta.user_id
      JOIN tasks t ON ta.task_id = t.task_id
      ORDER BY u.user_id, t.due_date;
    `;

    const [rows] = await db.query(query);

    res.json(rows);
  } catch (error) {
  console.error("DB ERROR:", error);
  res.status(500).json({ error: "Failed to fetch assignments" });
}
});

// Deletes a task and all its assignments; assignments must be removed first to respect the FK constraint.
app.delete("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    await db.query("DELETE FROM task_assignments WHERE task_id = ?", [taskId]);
    await db.query("DELETE FROM tasks WHERE task_id = ?", [taskId]);
    res.json({ success: true });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

// Returns all tasks assigned to the given user, each enriched with co-assignees and a
// boolean indicating whether every assignee has completed the task.
app.get("/my-tasks/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // All tasks assigned to this user, using per-assignee status from task_assignments
    const [taskRows] = await db.query(
      `SELECT t.task_id, t.task_name, t.due_date, t.priority, ta.status, t.created_by,
              (SELECT COUNT(*) = 0 FROM task_assignments ta2 WHERE ta2.task_id = t.task_id AND LOWER(ta2.status) != 'completed') AS all_completed
       FROM tasks t
       JOIN task_assignments ta ON t.task_id = ta.task_id
       WHERE ta.user_id = ?
       ORDER BY t.due_date`,
      [userId]
    ) as any[];

    if (!(taskRows as any[]).length) {
      res.json([]);
      return;
    }

    const taskIds = (taskRows as any[]).map((t: any) => t.task_id);

    // All co-assignees for those tasks (everyone except this user)
    const [coRows] = await db.query(
      `SELECT ta.task_id, u.user_id, u.name, u.timezone
       FROM task_assignments ta
       JOIN users u ON ta.user_id = u.user_id
       WHERE ta.task_id IN (?) AND ta.user_id != ?
       ORDER BY ta.task_id, u.user_id`,
      [taskIds, userId]
    ) as any[];

    // Group co-assignees by task_id
    const coMap = new Map<number, { user_id: number; name: string; timezone: string }[]>();
    (coRows as any[]).forEach((r: any) => {
      const list = coMap.get(r.task_id) ?? [];
      list.push({ user_id: Number(r.user_id), name: r.name, timezone: r.timezone });
      coMap.set(r.task_id, list);
    });

    const result = (taskRows as any[]).map((t: any) => ({
      task_id: t.task_id,
      task_name: t.task_name,
      due_date: t.due_date,
      priority: t.priority,
      status: t.status,
      all_completed: !!t.all_completed,
      created_by: t.created_by ?? null,
      co_assignees: coMap.get(t.task_id) ?? [],
    }));

    res.json(result);
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to fetch my tasks" });
  }
});

// Partially updates a task's fields. Task-level fields (name, due date, priority) are written
// to the tasks table; status is written per-assignee to task_assignments, skipping completed rows.
app.patch("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { task_name, due_date, priority, status } = req.body;

    // Update task-level fields in tasks table
    const taskFields: string[] = [];
    const taskValues: unknown[] = [];
    if (task_name !== undefined) { taskFields.push('task_name = ?'); taskValues.push(task_name); }
    if (due_date !== undefined)  { taskFields.push('due_date = ?');  taskValues.push(due_date);  }
    if (priority !== undefined)  { taskFields.push('priority = ?');  taskValues.push(priority);  }

    if (taskFields.length > 0) {
      await db.query(`UPDATE tasks SET ${taskFields.join(', ')} WHERE task_id = ?`, [...taskValues, taskId]);
    }

    // Status is per-assignee — update all non-completed rows for this task
    if (status !== undefined) {
      await db.query(
        `UPDATE task_assignments SET status = ? WHERE task_id = ? AND LOWER(status) != 'completed'`,
        [status, taskId]
      );
    }

    if (taskFields.length === 0 && status === undefined) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Updates only the requesting user's own status for a task, leaving other assignees' statuses untouched.
app.patch("/task-assignments/:taskId/users/:userId", async (req, res) => {
  try {
    const { taskId, userId } = req.params;
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }
    await db.query(
      `UPDATE task_assignments SET status = ? WHERE task_id = ? AND user_id = ?`,
      [status, taskId, userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to update assignment status" });
  }
});

// Returns aggregate task counts (all, completed, pending, high-priority, non-priority) across all users.
app.get("/stats", async (_req, res) => {
  try {
    const [[row]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM tasks) AS all_tasks,
        (SELECT COUNT(*) FROM tasks t
         WHERE (SELECT COUNT(*) FROM task_assignments ta WHERE ta.task_id = t.task_id) > 0
           AND (SELECT COUNT(*) FROM task_assignments ta WHERE ta.task_id = t.task_id AND ta.status != 'Completed') = 0
        ) AS completed,
        (SELECT COUNT(*) FROM tasks t
         WHERE (SELECT COUNT(*) FROM task_assignments ta WHERE ta.task_id = t.task_id AND ta.status = 'Pending') > 0
           AND (SELECT COUNT(*) FROM task_assignments ta WHERE ta.task_id = t.task_id AND ta.status != 'Completed') > 0
        ) AS pending,
        (SELECT COUNT(*) FROM tasks t
         WHERE t.priority IN ('High', 'Critical')
           AND (SELECT COUNT(*) FROM task_assignments ta WHERE ta.task_id = t.task_id AND ta.status != 'Completed') > 0
        ) AS priority_tasks,
        (SELECT COUNT(*) FROM tasks t
         WHERE t.priority IN ('Low', 'Medium')
           AND (SELECT COUNT(*) FROM task_assignments ta WHERE ta.task_id = t.task_id AND ta.status != 'Completed') > 0
        ) AS non_priority_tasks
    `) as any[];
    res.json({
      all_tasks: Number(row.all_tasks),
      completed: Number(row.completed),
      pending: Number(row.pending),
      priority_tasks: Number(row.priority_tasks),
      non_priority_tasks: Number(row.non_priority_tasks),
    });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Returns stat card counts based solely on this user's own assignment status —
// no cross-assignee checks so numbers reflect only what this user has personally done.
app.get("/stats/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [[row]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM task_assignments ta
         WHERE ta.user_id = ?) AS all_tasks,

        (SELECT COUNT(*) FROM task_assignments ta
         WHERE ta.user_id = ? AND ta.status = 'Completed') AS completed,

        (SELECT COUNT(*) FROM task_assignments ta
         WHERE ta.user_id = ? AND ta.status = 'Pending') AS pending,

        (SELECT COUNT(*) FROM tasks t
         JOIN task_assignments ta ON ta.task_id = t.task_id AND ta.user_id = ?
         WHERE t.priority IN ('High', 'Critical') AND ta.status != 'Completed'
        ) AS priority_tasks,

        (SELECT COUNT(*) FROM tasks t
         JOIN task_assignments ta ON ta.task_id = t.task_id AND ta.user_id = ?
         WHERE t.priority IN ('Low', 'Medium') AND ta.status != 'Completed'
        ) AS non_priority_tasks
    `, [userId, userId, userId, userId, userId]) as any[];
    res.json({
      all_tasks: Number(row.all_tasks),
      completed: Number(row.completed),
      pending: Number(row.pending),
      priority_tasks: Number(row.priority_tasks),
      non_priority_tasks: Number(row.non_priority_tasks),
    });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

// Returns a flat list of all tasks ordered by creation, used by admin dropdowns.
app.get("/tasks", async (_req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT task_id, task_name, due_date, priority, status FROM tasks ORDER BY task_id",
    );
    res.json(rows);
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// Returns all registered users with their timezone, used to populate assignee pickers.
app.get("/users", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT user_id, name, timezone FROM users ORDER BY user_id");
    res.json(rows);
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Creates a new task record and returns the generated task_id for subsequent assignment calls.
app.post("/tasks", async (req, res) => {
  try {
    const { task_name, due_date, priority, status, created_by } = req.body;
    if (!task_name || !due_date || !priority || !status) {
      return res.status(400).json({ error: "All fields required" });
    }
    const [result] = await db.query(
      "INSERT INTO tasks (task_name, due_date, priority, status, created_by) VALUES (?, ?, ?, ?, ?)",
      [task_name, due_date, priority, status, created_by ?? 1]
    ) as any[];
    res.json({ task_id: result.insertId });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Assigns a user to a task and fires an email notification to all current assignees.
// Email errors are caught and logged without failing the HTTP response.
app.post("/task-assignments", async (req, res) => {
  try {
    const { task_id, user_id } = req.body;
    if (!task_id || !user_id) {
      return res.status(400).json({ error: "task_id and user_id required" });
    }
    await db.query(
      "INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)",
      [task_id, user_id]
    );

    // Send email notification to all assignees of this task
    try {
      const [taskRows] = await db.query(
        "SELECT task_name, due_date, priority, status FROM tasks WHERE task_id = ?",
        [task_id]
      ) as any[];

      const [assigneeRows] = await db.query(
        `SELECT u.name, u.email FROM users u
         JOIN task_assignments ta ON u.user_id = ta.user_id
         WHERE ta.task_id = ? AND u.email IS NOT NULL`,
        [task_id]
      ) as any[];

      const assignees = assigneeRows as any[];
      const emails = assignees.map((r: any) => r.email as string).filter(Boolean);

      if (emails.length && (taskRows as any[]).length) {
        const task = (taskRows as any[])[0];
        const subject = `[TaskMent] New Task Assigned: ${task.task_name}`;
        const due = new Date(task.due_date).toLocaleDateString("en-GB", {
          day: "numeric", month: "long", year: "numeric",
        });
        const assigneeNames = assignees.map((r: any) => r.name as string).filter(Boolean).join(", ");
        const row = (label: string, value: string) =>
          `<tr>
            <td style="padding:6px 16px 6px 0;color:#6b7280;font-weight:600;white-space:nowrap;vertical-align:top;">${label}</td>
            <td style="padding:6px 4px;color:#6b7280;">:</td>
            <td style="padding:6px 0 6px 12px;color:#111827;">${value}</td>
          </tr>`;
        const html =
          `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;max-width:560px;margin:0 auto;">
            <p style="margin:0 0 16px;">Hi Team Member,</p>
            <p style="margin:0 0 20px;">You have been assigned a new Task. Please find the details below:</p>
            <table style="border-collapse:collapse;">
              ${row("Task", task.task_name)}
              ${row("Due Date", due)}
              ${row("Priority", task.priority)}
              ${row("Status", task.status)}
              ${row("Assignees", assigneeNames)}
            </table>
            <p style="margin:24px 0 8px;">Kindly log in to TaskMent and ensure this task is completed by the due date.</p>
            <p style="margin:0 0 8px;">Thank you.</p>
            <p style="margin:0;">Regards,<br><strong>TaskMent</strong></p>
          </div>`;
        await sendTaskAssignmentEmail(emails, subject, html);
      }
    } catch (emailErr) {
      console.error("Email notification error:", emailErr);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

// Removes a user's assignment, then deletes the task itself if no other assignments remain.
app.delete("/task-assignments", async (req, res) => {
  try {

    console.log("DELETE HIT BODY:", req.body);

    const { task_id, user_id } = req.body;

    if (!task_id || !user_id) {
      return res.status(400).json({ error: "task_id and user_id required" });
    }

    await db.query(
      "DELETE FROM task_assignments WHERE task_id = ? AND user_id = ?",
      [task_id, user_id]
    );

    // If no assignments remain for this task, the task is now orphaned — remove it.
    const [[{ remaining }]] = await db.query(
      "SELECT COUNT(*) AS remaining FROM task_assignments WHERE task_id = ?",
      [task_id]
    ) as any[];

    if (Number(remaining) === 0) {
      await db.query("DELETE FROM tasks WHERE task_id = ?", [task_id]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

// Partially updates a user's profile; only fields present in the request body are written.
app.patch("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, timezone } = req.body;

    const fields: string[] = [];
    const values: unknown[] = [];

    if (name !== undefined)     { fields.push('name = ?');     values.push(name);     }
    if (email !== undefined)    { fields.push('email = ?');    values.push(email);    }
    if (timezone !== undefined) { fields.push('timezone = ?'); values.push(timezone); }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
      [...values, userId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Authenticates a user by email + bcrypt password check; returns the safe user object (no hash) on success.
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    const [rows] = await db.query(
      "SELECT user_id, name, email, role, timezone, password AS hashed FROM users WHERE email = ?",
      [email]
    ) as any[];
    if (!(rows as any[]).length) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const user = (rows as any[])[0];
    const valid = await bcrypt.compare(password, user.hashed);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const { hashed: _h, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

// Registers a new user with a bcrypt-hashed password; rejects duplicate emails with 409.
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, timezone } = req.body;
    if (!name || !email || !password || !timezone) {
      return res.status(400).json({ error: "name, email, password, and timezone are required" });
    }
    const [existing] = await db.query(
      "SELECT user_id FROM users WHERE email = ?",
      [email]
    ) as any[];
    if ((existing as any[]).length) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const hashed = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO users (name, email, password, timezone, role) VALUES (?, ?, ?, ?, 'assignee')",
      [name, email, hashed, timezone]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to register" });
  }
});


export default app;

// Retries a DB ping on startup to bridge the gap between MySQL accepting TCP
// connections and actually being ready to authenticate — common in Docker compose.
async function waitForDb(retries = 10, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await db.query('SELECT 1');
      return;
    } catch {
      console.warn(`DB not ready (attempt ${attempt}/${retries}), retrying in ${delayMs}ms…`);
      if (attempt < retries) await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('Could not connect to the database after multiple retries');
}

if (process.env.NODE_ENV !== "test") {
  waitForDb()
    .then(() => app.listen(3000, () => console.log("Server running on port 3000")))
    .catch(err => { console.error("Startup failed:", err); process.exit(1); });
}