import { useState, useEffect, useMemo, useCallback } from 'react';
import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp';
import { TopCards } from 'src/components/dashboards/modern/TopCards';
import { MyTasksTable } from 'src/components/utilities/table/MyTasksTable';
import type { EmployeeRow } from 'src/components/utilities/table/MyTasksTable';
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
  co_assignees: { user_id: number; name: string; timezone: string }[];
};

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

const calcPriority = (rows: EmployeeRow[]) =>
  rows.filter((r) => ['critical', 'high'].includes(r.priority.toLowerCase()) && r.status.toLowerCase() !== 'completed').length;

const calcNonPriority = (rows: EmployeeRow[]) =>
  rows.filter((r) => ['low', 'medium'].includes(r.priority.toLowerCase()) && r.status.toLowerCase() !== 'completed').length;

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'My Tasks' },
];

const AllTasksPage = () => {
  const { user } = useAuth();
  const [apiData, setApiData] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [taskCount, setTaskCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [priorityCount, setPriorityCount] = useState(0);
  const [nonPriorityCount, setNonPriorityCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/my-tasks/${user.user_id}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json() as Promise<ApiTask[]>;
      })
      .then((data) => {
        setApiData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('API fetch error:', err);
        setError('Could not load tasks. Make sure the backend is running on port 3000.');
        setLoading(false);
      });
  }, [user]);

  const rows = useMemo<EmployeeRow[]>(
    () =>
      apiData.map((task) => ({
        task_id: task.task_id,
        coAssignees: task.co_assignees.map((ca) => ({
          text: ca.name,
          image: userImages[(ca.user_id - 1) % userImages.length],
          timezone: ca.timezone,
        })),
        task: task.task_name,
        'due date': formatDueDate(task.due_date),
        priority: task.priority,
        status: task.status,
      })),
    [apiData],
  );

  useEffect(() => {
    if (rows.length === 0) return;
    setTaskCount(rows.length);
    setCompletedCount(rows.filter((r) => r.status.toLowerCase() === 'completed').length);
    setPendingCount(rows.filter((r) => r.status.toLowerCase() === 'pending').length);
    setPriorityCount(calcPriority(rows));
    setNonPriorityCount(calcNonPriority(rows));
  }, [rows]);

  const handleDataChange = useCallback((d: EmployeeRow[]) => {
    setTaskCount(d.length);
    setCompletedCount(d.filter((r) => r.status.toLowerCase() === 'completed').length);
    setPendingCount(d.filter((r) => r.status.toLowerCase() === 'pending').length);
    setPriorityCount(calcPriority(d));
    setNonPriorityCount(calcNonPriority(d));
  }, []);

  return (
    <>
      <BreadcrumbComp title="My Tasks" items={BCrumb} />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <TopCards
            allTasksCount={taskCount}
            completedCount={completedCount}
            pendingCount={pendingCount}
            priorityCount={priorityCount}
            nonPriorityCount={nonPriorityCount}
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
                No tasks assigned to you.
              </div>
            )}
            {!loading && !error && rows.length > 0 && (
              <MyTasksTable
                data={rows}
                onDataChange={handleDataChange}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AllTasksPage;
