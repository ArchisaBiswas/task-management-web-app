import { useState, useEffect, useMemo, useCallback } from 'react';
import { TopCards } from 'src/components/dashboards/modern/TopCards';
import { MyTasksTable } from 'src/components/utilities/table/MyTasksTable';
import type { EmployeeRow } from 'src/components/utilities/table/MyTasksTable';
import ProfileWelcome from 'src/components/dashboards/modern/ProfileWelcome';
import { useAuth } from 'src/context/AuthContext';

import userimg1 from 'src/assets/images/profile/user-1.jpg';
import userimg2 from 'src/assets/images/profile/user-2.jpg';
import userimg3 from 'src/assets/images/profile/user-3.jpg';
import userimg4 from 'src/assets/images/profile/user-4.jpg';
import userimg5 from 'src/assets/images/profile/user-5.jpg';
import userimg6 from 'src/assets/images/profile/user-6.jpg';
import userimg7 from 'src/assets/images/profile/user-7.jpg';
import userimg8 from 'src/assets/images/profile/user-8.jpg';
import userimg9 from 'src/assets/images/profile/user-9.jpg';
import userimg10 from 'src/assets/images/profile/user-10.jpg';

const userImages = [
  userimg1, userimg2, userimg3, userimg4, userimg5,
  userimg6, userimg7, userimg8, userimg9, userimg10,
];

type ApiTask = {
  task_id: number;
  task_name: string;
  due_date: string | Date;
  priority: string;
  status: string;
  all_completed: boolean;
  co_assignees: { user_id: number; name: string; timezone: string }[];
};

type Stats = {
  allTasksCount: number;
  completedCount: number;
  pendingCount: number;
  priorityCount: number;
  nonPriorityCount: number;
};

// Formats a date value as "1st April, 2025" using UTC fields to avoid timezone-induced day shifts.
const formatDueDate = (raw: string | Date): string => {
  const d = raw instanceof Date ? raw : new Date(raw);
  const day = d.getUTCDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? 'st' :
    day % 10 === 2 && day !== 12 ? 'nd' :
    day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${day}${suffix} ${month}, ${d.getUTCFullYear()}`;
};

// Displays the current user's assigned tasks with stat cards. Auto-marks overdue tasks
// as "Pending" on load and continues checking every 60 seconds while the page is open.
const AllTasksPage = () => {
  const { user } = useAuth();
  const [apiData, setApiData] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    allTasksCount: 0,
    completedCount: 0,
    pendingCount: 0,
    priorityCount: 0,
    nonPriorityCount: 0,
  });

  // Fetches stat card counts scoped to the logged-in user; wrapped in useCallback so it
  // can be passed to child components (e.g. MyTasksTable) as a stable reference.
  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/stats/user/${user.user_id}`);
      const d = await res.json();
      setStats({
        allTasksCount: d.all_tasks,
        completedCount: d.completed,
        pendingCount: d.pending,
        priorityCount: d.priority_tasks,
        nonPriorityCount: d.non_priority_tasks,
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [user]);

  // Refreshes stats and, when a task is deleted, removes it from apiData so the
  // 60-second overdue interval cannot restore the deleted row from stale state.
  const handleMutation = useCallback((deletedTaskId?: number) => {
    fetchStats();
    if (deletedTaskId !== undefined) {
      setApiData((prev) => prev.filter((t) => t.task_id !== deletedTaskId));
    }
  }, [fetchStats]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
    fetch(`${import.meta.env.VITE_API_URL}/my-tasks/${user.user_id}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json() as Promise<ApiTask[]>;
      })
      .then(async (data) => {
        const now = new Date();
        const patches: Promise<any>[] = [];

        const enriched = data.map((task) => {
          const due = new Date(task.due_date);
          const endOfDayGMT = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 1));
          const overdue = now >= endOfDayGMT;
          const statusLower = (task.status ?? '').toLowerCase();
          if (overdue && statusLower !== 'completed' && statusLower !== 'pending') {
            patches.push(
              fetch(`${import.meta.env.VITE_API_URL}/tasks/${task.task_id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Pending' }),
              })
            );
            return { ...task, status: 'Pending' };
          }
          return task;
        });

        if (patches.length) {
          await Promise.all(patches);
          fetchStats();
        }

        setApiData(enriched);
        setLoading(false);
      })
      .catch((err) => {
        console.error('API fetch error:', err);
        setError('Could not load tasks. Make sure the backend is running on port 3000.');
        setLoading(false);
      });
  }, [user, fetchStats]);

  // Continuously check for tasks that become overdue while page is open (every 60s)
  useEffect(() => {
    if (!apiData.length) return;
    const id = setInterval(() => {
      const now = new Date();
      const overdueIds: number[] = [];
      const updated = apiData.map((task) => {
        const due = new Date(task.due_date);
        const endOfDayGMT = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 1));
        const statusLower = (task.status ?? '').toLowerCase();
        if (now >= endOfDayGMT && statusLower !== 'completed' && statusLower !== 'pending') {
          overdueIds.push(task.task_id);
          return { ...task, status: 'Pending' };
        }
        return task;
      });
      if (!overdueIds.length) return;
      setApiData(updated);
      Promise.all(
        overdueIds.map((taskId) =>
          fetch(`${import.meta.env.VITE_API_URL}/tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Pending' }),
          }).catch(console.error)
        )
      ).then(() => fetchStats());
    }, 60_000);
    return () => clearInterval(id);
  }, [apiData, fetchStats]);

  const rows = useMemo<EmployeeRow[]>(
    () =>
      apiData.map((task) => {
        const d = task.due_date instanceof Date ? task.due_date : new Date(task.due_date);
        return {
          task_id: task.task_id,
          coAssignees: task.co_assignees.map((ca) => ({
            text: ca.name,
            image: userImages[(ca.user_id - 1) % userImages.length],
            timezone: ca.timezone,
          })),
          task: task.task_name,
          'due date': formatDueDate(task.due_date),
          rawDueDate: d.toISOString().split('T')[0],
          priority: task.priority,
          status: task.status,
          all_completed: task.all_completed,
        };
      }),
    [apiData],
  );

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12">
        <ProfileWelcome />
      </div>
      <div className="col-span-12">
        <TopCards
          allTasksCount={stats.allTasksCount}
          completedCount={stats.completedCount}
          pendingCount={stats.pendingCount}
          priorityCount={stats.priorityCount}
          nonPriorityCount={stats.nonPriorityCount}
        />
      </div>
      <div className="col-span-12 flex">
        <div className="flex gap-6 flex-col w-full min-w-0">
          {loading && (
            <div className="text-center py-16 text-gray-500 dark:text-white/50 text-sm">
              Loading tasks…
            </div>
          )}
          {error && (
            <div className="text-center py-16 text-red-500 text-sm">{error}</div>
          )}
          {!loading && !error && rows.length === 0 && (
            <div className="text-center py-16 text-gray-500 dark:text-white/50 text-sm">
              No tasks assigned to you yet.
            </div>
          )}
          {!loading && !error && rows.length > 0 && (
            <MyTasksTable
              data={rows}
              userId={user?.user_id}
              onMutation={handleMutation}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AllTasksPage;
