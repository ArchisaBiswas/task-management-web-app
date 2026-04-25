import express from "express";
import { db } from "./db";

const app = express();
app.use(express.json());
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

// 👇 ADD THIS ROUTE
app.get("/assignments", async (req, res) => {
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
        t.status
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

app.get("/my-tasks/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // All tasks assigned to this user
    const [taskRows] = await db.query(
      `SELECT t.task_id, t.task_name, t.due_date, t.priority, t.status
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
      co_assignees: coMap.get(t.task_id) ?? [],
    }));

    res.json(result);
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to fetch my tasks" });
  }
});

app.patch("/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const { task_name, due_date, priority, status } = req.body;

    console.log("PATCH /tasks/:taskId hit");
    console.log("taskId:", taskId);
    console.log("body:", req.body);

    const fields: string[] = [];
    const values: unknown[] = [];

    if (task_name !== undefined) { fields.push('task_name = ?'); values.push(task_name); }
    if (due_date !== undefined)  { fields.push('due_date = ?');  values.push(due_date);  }
    if (priority !== undefined)  { fields.push('priority = ?');  values.push(priority);  }
    if (status !== undefined)    { fields.push('status = ?');    values.push(status);    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE task_id = ?`;
    console.log("SQL:", sql);
    console.log("values:", [...values, taskId]);

    const [result] = await db.query(sql, [...values, taskId]);
    console.log("result:", result);
    res.json({ success: true });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

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

app.get("/users", async (_req, res) => {
  try {
    const [rows] = await db.query("SELECT user_id, name, timezone FROM users ORDER BY user_id");
    res.json(rows);
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/tasks", async (req, res) => {
  try {
    const { task_name, due_date, priority, status } = req.body;
    if (!task_name || !due_date || !priority || !status) {
      return res.status(400).json({ error: "All fields required" });
    }
    const [result] = await db.query(
      "INSERT INTO tasks (task_name, due_date, priority, status) VALUES (?, ?, ?, ?)",
      [task_name, due_date, priority, status]
    ) as any[];
    res.json({ task_id: result.insertId });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});

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
    res.json({ success: true });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

app.delete("/task-assignments", async (req, res) => {
  try {

    console.log("DELETE HIT BODY:", req.body);

    const { task_id, user_id } = req.body;

    if (!task_id || !user_id) {
      return res.status(400).json({ error: "task_id and user_id required" });
    }

    const sql = `
      DELETE FROM task_assignments
      WHERE task_id = ? AND user_id = ?
    `;

    await db.query(sql, [task_id, user_id]);

    res.json({ success: true });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to delete assignment" });
  }
});

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

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }
    const [rows] = await db.query(
      "SELECT user_id, name, email, role, timezone FROM users WHERE email = ? AND password = ?",
      [email, password]
    ) as any[];
    if (!(rows as any[]).length) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    res.json((rows as any[])[0]);
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to login" });
  }
});

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
    await db.query(
      "INSERT INTO users (name, email, password, timezone, role) VALUES (?, ?, ?, ?, 'assignee')",
      [name, email, password, timezone]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("DB ERROR:", error);
    res.status(500).json({ error: "Failed to register" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});