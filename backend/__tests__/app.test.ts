import request from "supertest";

// ── Mocks must be declared before any imports that trigger app.ts ──
jest.mock("../db", () => ({
  db: { query: jest.fn() },
}));

jest.mock("../ses-email", () => ({
  sendTaskAssignmentEmail: jest.fn().mockResolvedValue({}),
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn().mockResolvedValue("hashed_password"),
  compare: jest.fn(),
}));

import app from "../app";
import { db } from "../db";
import { sendTaskAssignmentEmail } from "../ses-email";
import bcrypt from "bcryptjs";

const mockQuery = db.query as jest.Mock;
const mockSendEmail = sendTaskAssignmentEmail as jest.Mock;
const mockBcryptCompare = bcrypt.compare as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────
// GET /assignments
// ─────────────────────────────────────────────
describe("GET /assignments", () => {
  it("returns all assignments", async () => {
    const rows = [
      { task_id: 1, user_id: 2, name: "Alice", timezone: "Asia/Kolkata", task_name: "Fix bug", due_date: "2025-12-01", priority: "High", status: "Active" },
    ];
    mockQuery.mockResolvedValueOnce([rows]);

    const res = await request(app).get("/assignments");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(rows);
  });

  it("returns 500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).get("/assignments");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to fetch assignments");
  });
});

// ─────────────────────────────────────────────
// GET /my-tasks/:userId
// ─────────────────────────────────────────────
describe("GET /my-tasks/:userId", () => {
  it("returns empty array when user has no tasks", async () => {
    mockQuery.mockResolvedValueOnce([[]]); // taskRows empty

    const res = await request(app).get("/my-tasks/1");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns tasks with co-assignees", async () => {
    const taskRows = [
      { task_id: 1, task_name: "Deploy app", due_date: "2025-12-01", priority: "High", status: "Active", created_by: 1, all_completed: 0 },
    ];
    const coRows = [
      { task_id: 1, user_id: 3, name: "Bob", timezone: "Europe/London" },
    ];
    mockQuery
      .mockResolvedValueOnce([taskRows]) // tasks
      .mockResolvedValueOnce([coRows]);  // co-assignees

    const res = await request(app).get("/my-tasks/1");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].task_name).toBe("Deploy app");
    expect(res.body[0].co_assignees).toEqual([{ user_id: 3, name: "Bob", timezone: "Europe/London" }]);
  });

  it("returns 500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB fail"));

    const res = await request(app).get("/my-tasks/1");

    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────
// PATCH /tasks/:taskId
// ─────────────────────────────────────────────
describe("PATCH /tasks/:taskId", () => {
  it("updates task name and priority", async () => {
    mockQuery.mockResolvedValue([{}]);

    const res = await request(app)
      .patch("/tasks/1")
      .send({ task_name: "New name", priority: "Critical" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE tasks SET"),
      expect.arrayContaining(["New name", "Critical", "1"])
    );
  });

  it("updates only status in task_assignments", async () => {
    mockQuery.mockResolvedValue([{}]);

    const res = await request(app)
      .patch("/tasks/5")
      .send({ status: "Completed" });

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE task_assignments SET status"),
      ["Completed", "5"]
    );
  });

  it("returns 400 when no fields supplied", async () => {
    const res = await request(app).patch("/tasks/1").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("returns 500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("fail"));

    const res = await request(app).patch("/tasks/1").send({ priority: "Low" });

    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────
// PATCH /task-assignments/:taskId/users/:userId
// ─────────────────────────────────────────────
describe("PATCH /task-assignments/:taskId/users/:userId", () => {
  it("updates a single assignee status", async () => {
    mockQuery.mockResolvedValue([{}]);

    const res = await request(app)
      .patch("/task-assignments/2/users/3")
      .send({ status: "Completed" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE task_assignments SET status"),
      ["Completed", "2", "3"]
    );
  });

  it("returns 400 when status is missing", async () => {
    const res = await request(app)
      .patch("/task-assignments/2/users/3")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("status is required");
  });
});

// ─────────────────────────────────────────────
// GET /stats
// ─────────────────────────────────────────────
describe("GET /stats", () => {
  it("returns stat counts", async () => {
    const row = { all_tasks: 10n, completed: 3n, pending: 2n, priority_tasks: 4n, non_priority_tasks: 6n };
    mockQuery.mockResolvedValueOnce([[row]]);

    const res = await request(app).get("/stats");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      all_tasks: 10,
      completed: 3,
      pending: 2,
      priority_tasks: 4,
      non_priority_tasks: 6,
    });
  });

  it("returns 500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("fail"));

    const res = await request(app).get("/stats");

    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────
// GET /stats/user/:userId
// ─────────────────────────────────────────────
describe("GET /stats/user/:userId", () => {
  it("returns stat counts scoped to a user", async () => {
    const row = { all_tasks: 5n, completed: 1n, pending: 1n, priority_tasks: 2n, non_priority_tasks: 3n };
    mockQuery.mockResolvedValueOnce([[row]]);

    const res = await request(app).get("/stats/user/2");

    expect(res.status).toBe(200);
    expect(res.body.all_tasks).toBe(5);
    expect(res.body.completed).toBe(1);
  });
});

// ─────────────────────────────────────────────
// DELETE /tasks/:taskId
// ─────────────────────────────────────────────
describe("DELETE /tasks/:taskId", () => {
  it("deletes assignments then task", async () => {
    mockQuery.mockResolvedValue([{}]);

    const res = await request(app).delete("/tasks/7");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      "DELETE FROM task_assignments WHERE task_id = ?",
      ["7"]
    );
    expect(mockQuery).toHaveBeenCalledWith(
      "DELETE FROM tasks WHERE task_id = ?",
      ["7"]
    );
  });

  it("returns 500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("fail"));

    const res = await request(app).delete("/tasks/7");

    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────
// POST /tasks
// ─────────────────────────────────────────────
describe("POST /tasks", () => {
  it("creates a task and returns task_id", async () => {
    mockQuery.mockResolvedValueOnce([{ insertId: 42 }]);

    const res = await request(app)
      .post("/tasks")
      .send({ task_name: "Write tests", due_date: "2025-12-31", priority: "High", status: "Active" });

    expect(res.status).toBe(200);
    expect(res.body.task_id).toBe(42);
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/tasks")
      .send({ task_name: "No date" });

    expect(res.status).toBe(400);
  });

  it("returns 500 on DB error", async () => {
    mockQuery.mockRejectedValueOnce(new Error("fail"));

    const res = await request(app)
      .post("/tasks")
      .send({ task_name: "T", due_date: "2025-01-01", priority: "Low", status: "Active" });

    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────
// POST /task-assignments
// ─────────────────────────────────────────────
describe("POST /task-assignments", () => {
  it("creates assignment and sends email", async () => {
    mockQuery
      .mockResolvedValueOnce([{}])                                   // INSERT
      .mockResolvedValueOnce([[{ task_name: "Deploy", due_date: "2025-12-01", priority: "High", status: "Active" }]]) // task
      .mockResolvedValueOnce([[{ name: "Alice", email: "alice@example.com" }]]); // assignees

    const res = await request(app)
      .post("/task-assignments")
      .send({ task_id: 1, user_id: 2 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
    const [emails, subject, html] = mockSendEmail.mock.calls[0];
    expect(emails).toContain("alice@example.com");
    expect(subject).toContain("Deploy");
    expect(html).toContain("Assignees");
    expect(html).toContain("Alice");
  });

  it("returns 400 when task_id or user_id is missing", async () => {
    const res = await request(app)
      .post("/task-assignments")
      .send({ task_id: 1 });

    expect(res.status).toBe(400);
  });

  it("still returns 200 even if email fails", async () => {
    mockQuery
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([[{ task_name: "T", due_date: "2025-01-01", priority: "Low", status: "Active" }]])
      .mockResolvedValueOnce([[{ name: "Bob", email: "bob@test.com" }]]);
    mockSendEmail.mockRejectedValueOnce(new Error("SES down"));

    const res = await request(app)
      .post("/task-assignments")
      .send({ task_id: 2, user_id: 3 });

    expect(res.status).toBe(200);
  });
});

// ─────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────
describe("POST /login", () => {
  it("returns user data on valid credentials", async () => {
    mockQuery.mockResolvedValueOnce([[
      { user_id: 1, name: "Admin", email: "admin@test.com", role: "admin", timezone: "UTC", hashed: "hashed_pw" }
    ]]);
    mockBcryptCompare.mockResolvedValueOnce(true);

    const res = await request(app)
      .post("/login")
      .send({ email: "admin@test.com", password: "secret" });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("admin@test.com");
    expect(res.body.hashed).toBeUndefined(); // password hash must not be returned
  });

  it("returns 401 for wrong password", async () => {
    mockQuery.mockResolvedValueOnce([[
      { user_id: 1, name: "Admin", email: "admin@test.com", hashed: "hashed_pw" }
    ]]);
    mockBcryptCompare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post("/login")
      .send({ email: "admin@test.com", password: "wrong" });

    expect(res.status).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    mockQuery.mockResolvedValueOnce([[]]); // no user found

    const res = await request(app)
      .post("/login")
      .send({ email: "nobody@test.com", password: "pass" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when email or password is missing", async () => {
    const res = await request(app)
      .post("/login")
      .send({ email: "x@x.com" });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// POST /register
// ─────────────────────────────────────────────
describe("POST /register", () => {
  it("creates a new user successfully", async () => {
    mockQuery
      .mockResolvedValueOnce([[]])  // no existing user
      .mockResolvedValueOnce([{}]); // INSERT

    const res = await request(app)
      .post("/register")
      .send({ name: "New User", email: "new@test.com", password: "pass1234", timezone: "UTC" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 409 when email is already registered", async () => {
    mockQuery.mockResolvedValueOnce([[{ user_id: 5 }]]); // existing user

    const res = await request(app)
      .post("/register")
      .send({ name: "Dup", email: "dup@test.com", password: "pass1234", timezone: "UTC" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email already registered");
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await request(app)
      .post("/register")
      .send({ name: "No Email" });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// GET /users
// ─────────────────────────────────────────────
describe("GET /users", () => {
  it("returns list of users", async () => {
    const users = [
      { user_id: 1, name: "Alice", timezone: "UTC" },
      { user_id: 2, name: "Bob", timezone: "Europe/London" },
    ];
    mockQuery.mockResolvedValueOnce([users]);

    const res = await request(app).get("/users");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe("Alice");
  });
});

// ─────────────────────────────────────────────
// PATCH /users/:userId
// ─────────────────────────────────────────────
describe("PATCH /users/:userId", () => {
  it("updates user profile fields", async () => {
    mockQuery.mockResolvedValue([{}]);

    const res = await request(app)
      .patch("/users/3")
      .send({ name: "Updated Name", timezone: "Asia/Tokyo" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 400 when no fields supplied", async () => {
    const res = await request(app).patch("/users/3").send({});

    expect(res.status).toBe(400);
  });
});
