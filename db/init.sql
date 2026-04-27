CREATE DATABASE IF NOT EXISTS taskment CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE taskment;

CREATE TABLE IF NOT EXISTS users (
  user_id  INT          AUTO_INCREMENT PRIMARY KEY,
  name     VARCHAR(255) NOT NULL,
  email    VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  role     VARCHAR(50)  NOT NULL DEFAULT 'assignee'
);

CREATE TABLE IF NOT EXISTS tasks (
  task_id    INT          AUTO_INCREMENT PRIMARY KEY,
  task_name  VARCHAR(255) NOT NULL,
  due_date   DATE         NOT NULL,
  priority   VARCHAR(50)  NOT NULL,
  status     VARCHAR(50)  NOT NULL,
  created_by INT,
  FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS task_assignments (
  task_id INT        NOT NULL,
  user_id INT        NOT NULL,
  status  VARCHAR(50) NOT NULL DEFAULT 'Active',
  PRIMARY KEY (task_id, user_id),
  FOREIGN KEY (task_id) REFERENCES tasks(task_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id)  ON DELETE CASCADE
);

INSERT INTO users (user_id, name, role, email, timezone, password) VALUES
(1, 'Alice Johnson', 'admin', 'alice.johnson@gmail.com', 'Europe/London', '$2b$10$4AesUPmSp0iWr8atRg.uCOUc.O02T6Sdt..7U9btvPVLEEg1Dq.4e'),
(2, 'Bob Smith', 'assignee', 'bob.smith@yahoo.co.in', 'America/Los_Angeles', '$2b$10$UCNiTzzYwn1yoLUIV6JS2uHc91BOQyL92MyEHgAa8LefD45pS5bfW'),
(3, 'Charlie Brown', 'assignee', 'charlie.brown@example.com', 'Asia/Kolkata', '$2b$10$QKwgsGLPNWfsAagvX5NixOQKeq1YsktSxc.8Ar48e2xlXXIllJnGy'),
(4, 'Diana Prince', 'assignee', 'archisabiswas2002@gmail.com', 'Europe/Paris', '$2b$10$VemRhfE0cwv4DZtrjRkIKe1Ho4tpmcDZVPaIRNDyw3T86qHuqqnpe'),
(5, 'Ethan Hunt', 'assignee', 'ethan.hunt@example.com', 'America/Los_Angeles', '$2b$10$6n0vt5XZB21jfUSl5xdN5uqnMTeBNMttYKMISqDQKZkRc/hUai8MW'),
(6, 'Fatima Khan', 'assignee', 'fatima.khan@example.com', 'Asia/Dubai', '$2b$10$S1epQCHO/amJJSSNCz75TugJ9A39XJV.QIvtLb60vY5nyFzaKLuD6'),
(7, 'Bob Dylan', 'assignee', 'bob.dylan@gmail.com', 'America/Los_Angeles', '$2b$10$raCnd8zVkSGYwoYB65jlZOgv43/abGyfifICrLRXqPqfgeCgdl7di'),
(8, 'Swati Biswas', 'assignee', 'biswasswati20@gmail.com', 'Asia/Kolkata', '$2b$10$KRi7Bw4B48QJ6GXougkCvedrAqBDpstTR0n.aWKWXnngY0og87PEC');

INSERT INTO tasks (task_id, task_name, due_date, priority, status, created_by) VALUES
(1, 'Build Login Gemini API', '2026-05-01', 'Medium', 'Active', 1),
(2, 'Design Database Schema', '2026-05-08', 'Critical', 'Completed', 1),
(3, 'Frontend Dashboard UI', '2026-04-24', 'Medium', 'Pending', 1),
(4, 'Implement Task Assignment Logic', '2026-05-03', 'High', 'Active', 1),
(5, 'Write Unit Tests', '2026-04-08', 'Low', 'Pending', 1),
(37, 'New Testing Task', '2026-04-28', 'Medium', 'Active', 1);

INSERT INTO task_assignments (task_id, user_id, status) VALUES
(1, 3, 'Active'),
(2, 1, 'Completed'),
(2, 4, 'Completed'),
(3, 3, 'Pending'),
(3, 5, 'Pending'),
(4, 6, 'Active'),
(5, 2, 'Pending'),
(5, 3, 'Pending'),
(37, 2, 'Completed'),
(37, 4, 'Active'),
(37, 6, 'Active'),
(37, 8, 'Active');

ALTER TABLE users AUTO_INCREMENT = 9;
ALTER TABLE tasks AUTO_INCREMENT = 38;
