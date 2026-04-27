import { Icon } from '@iconify/react/dist/iconify.js';
import { useEffect, useState } from 'react';
import { Button } from 'src/components/ui/button';
import { Calendar } from 'src/components/ui/calendar';
import { Checkbox } from 'src/components/ui/checkbox';
import { Label } from 'src/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from 'src/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';

type DbTask = {
  task_id: number;
  task_name: string;
  due_date: string;
  priority: string;
  status: string;
};

type DbUser = { user_id: number; name: string; timezone: string };
type UserOption = DbUser & { officeStatus: 'In-Office' | 'Out-of-Office' };
type AssignmentRow = { task_id: number; user_id: number };

// Returns whether the current local time in the given timezone falls within 09:00–17:00.
const getOfficeStatus = (timezone: string): 'In-Office' | 'Out-of-Office' => {
  const hour =
    parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        hour12: false,
      }).format(new Date()),
      10,
    ) % 24;
  return hour >= 9 && hour < 17 ? 'In-Office' : 'Out-of-Office';
};

// Parses a DB date string (e.g. "2025-04-01T00:00:00.000Z") into a local Date without
// timezone shifting — splitting on 'T' avoids UTC-to-local conversion that would shift the day.
const parseDbDate = (raw: string): Date => {
  const [y, m, d] = raw.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};

const priorityConfig: Record<string, { triggerCls: string; dotCls: string }> = {
  low:      { triggerCls: 'bg-primary      text-white border-primary',    dotCls: 'bg-primary' },
  medium:   { triggerCls: 'bg-warning      text-white border-warning',    dotCls: 'bg-warning' },
  high:     { triggerCls: 'bg-error        text-white border-error',      dotCls: 'bg-error' },
  critical: { triggerCls: 'bg-purple-700   text-white border-purple-700', dotCls: 'bg-purple-700' },
};

const statusConfig: Record<string, { triggerCls: string; dotCls: string }> = {
  active:    { triggerCls: 'bg-blue-600   text-white border-blue-600',   dotCls: 'bg-blue-600' },
  pending:   { triggerCls: 'bg-yellow-500 text-white border-yellow-500', dotCls: 'bg-yellow-500' },
  completed: { triggerCls: 'bg-green-600  text-white border-green-600',  dotCls: 'bg-green-600' },
};

// Admin form for updating any task. On mount it fetches all tasks, users, and current
// assignments so the selectors can be pre-populated when a task is chosen.
const UpdateTaskForm = () => {
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);

  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [originalAssigneeIds, setOriginalAssigneeIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/tasks').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/assignments').then((r) => r.json()),
    ])
      .then(([tasksData, usersData, assignmentsData]) => {
        setTasks(tasksData);
        setUsers(
          usersData.map((u: DbUser) => ({ ...u, officeStatus: getOfficeStatus(u.timezone) })),
        );
        setAssignments(
          assignmentsData.map((a: AssignmentRow) => ({
            task_id: Number(a.task_id),
            user_id: Number(a.user_id),
          })),
        );
      })
      .catch(console.error);
  }, []);

  // Populates all form fields from the selected task and records the current assignees
  // so handleUpdate can diff against them to determine adds and removes.
  const handleTaskSelect = (taskIdStr: string) => {
    const taskId = parseInt(taskIdStr);
    setSelectedTaskId(taskId);
    const task = tasks.find((t) => t.task_id === taskId);
    if (!task) return;

    setPriority(task.priority.toLowerCase());
    setStatus(task.status.toLowerCase());
    setDate(parseDbDate(task.due_date));

    const currentIds = assignments
      .filter((a) => a.task_id === taskId)
      .map((a) => a.user_id);
    setSelectedAssigneeIds(currentIds);
    setOriginalAssigneeIds(currentIds);
  };

  // Adds the user to the selection if not present, removes them if already selected.
  const toggleAssignee = (userId: number) =>
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );

  // Saves task field changes, then diffs current vs original assignees to POST new ones
  // and DELETE removed ones; updates local state so re-selecting the task reflects changes immediately.
  const handleUpdate = async () => {
    if (!selectedTaskId || !date || !priority || !status) return;
    setSubmitting(true);
    try {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');

      const taskRes = await fetch(`/api/tasks/${selectedTaskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          due_date: `${y}-${m}-${d}`,
          priority: priority.charAt(0).toUpperCase() + priority.slice(1),
          status: status.charAt(0).toUpperCase() + status.slice(1),
        }),
      });
      if (!taskRes.ok) throw new Error('Failed to update task');

      const toAdd = selectedAssigneeIds.filter((id) => !originalAssigneeIds.includes(id));
      const toRemove = originalAssigneeIds.filter((id) => !selectedAssigneeIds.includes(id));

      await Promise.all([
        ...toAdd.map((userId) =>
          fetch('/api/task-assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: selectedTaskId, user_id: userId }),
          }),
        ),
        ...toRemove.map((userId) =>
          fetch('/api/task-assignments', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id: selectedTaskId, user_id: userId }),
          }),
        ),
      ]);

      // Sync local state so re-selecting the same task shows updated data
      setAssignments((prev) => {
        const kept = prev.filter(
          (a) => !(a.task_id === selectedTaskId && toRemove.includes(a.user_id)),
        );
        return [
          ...kept,
          ...toAdd.map((userId) => ({ task_id: selectedTaskId, user_id: userId })),
        ];
      });
      setOriginalAssigneeIds(selectedAssigneeIds);

      setTasks((prev) =>
        prev.map((t) =>
          t.task_id === selectedTaskId
            ? {
                ...t,
                due_date: `${y}-${m}-${d}`,
                priority: priority.charAt(0).toUpperCase() + priority.slice(1),
                status: status.charAt(0).toUpperCase() + status.slice(1),
              }
            : t,
        ),
      );

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to update task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
      <div className="xl:col-span-2 rounded-xl border border-border md:p-6 p-4">
        <h5 className="card-title text-center">Let's Update A Task</h5>
        <div className="mt-6 flex flex-col gap-6">

          {/* Task dropdown — all tasks from DB */}
          <div>
            <Label htmlFor="task-select">Task</Label>
            <Select
              value={selectedTaskId ? String(selectedTaskId) : ''}
              onValueChange={handleTaskSelect}
            >
              <SelectTrigger
                id="task-select"
                className="mt-2 w-full border-primary data-[placeholder]:text-primary"
              >
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {tasks.length === 0 ? (
                  <SelectItem value="__loading__" disabled>
                    Loading tasks…
                  </SelectItem>
                ) : (
                  tasks.map((task) => (
                    <SelectItem key={task.task_id} value={String(task.task_id)}>
                      {task.task_name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Assignees */}
          <div>
            <Label>Assignees</Label>
            <Popover open={assigneesOpen} onOpenChange={setAssigneesOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  disabled={!selectedTaskId}
                  className="mt-2 w-full justify-between font-normal hover:bg-transparent focus:border-primary"
                >
                  <span className="truncate text-left">
                    {selectedAssigneeIds.length > 0
                      ? users
                          .filter((u) => selectedAssigneeIds.includes(u.user_id))
                          .map((u) => u.name)
                          .join(', ')
                      : 'Select Assignees'}
                  </span>
                  <Icon
                    icon="solar:alt-arrow-down-linear"
                    width={16}
                    height={16}
                    className="shrink-0 ml-2 opacity-60"
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
                {users.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted cursor-pointer"
                    onClick={() => toggleAssignee(user.user_id)}
                  >
                    <Checkbox
                      checked={selectedAssigneeIds.includes(user.user_id)}
                      onCheckedChange={() => toggleAssignee(user.user_id)}
                    />
                    <span className="text-sm font-normal flex-1">
                      {user.name}{' '}
                      <span
                        className={
                          user.officeStatus === 'In-Office'
                            ? 'text-green-600 font-medium'
                            : 'text-gray-400'
                        }
                      >
                        ({user.officeStatus})
                      </span>
                    </span>
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-3">
            <Label htmlFor="due-date" className="px-1">Due Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="due-date"
                  disabled={!selectedTaskId}
                  className="w-full justify-between font-normal hover:bg-transparent focus:border-primary"
                >
                  {date ? date.toLocaleDateString() : 'Select date'}
                  <Icon icon="solar:calendar-minimalistic-linear" width={18} height={18} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  captionLayout="dropdown"
                  disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
                  onSelect={(d) => {
                    setDate(d);
                    setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority} disabled={!selectedTaskId}>
              <SelectTrigger
                id="priority"
                className={`mt-2 w-full transition-colors ${
                  priority
                    ? priorityConfig[priority].triggerCls
                    : 'border-primary data-[placeholder]:text-primary'
                }`}
              >
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                  <SelectItem key={level} value={level}>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityConfig[level].dotCls}`}
                      />
                      <span className="capitalize">{level}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={setStatus} disabled={!selectedTaskId}>
              <SelectTrigger
                id="status"
                className={`mt-2 w-full transition-colors ${
                  status
                    ? statusConfig[status].triggerCls
                    : 'border-primary data-[placeholder]:text-primary'
                }`}
              >
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {(['active', 'pending', 'completed'] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConfig[s].dotCls}`}
                      />
                      <span className="capitalize">{s}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end items-center gap-3">
            {submitted && (
              <span className="text-sm text-green-600 font-medium">Task updated successfully!</span>
            )}
            <Button
              className="rounded-md whitespace-nowrap"
              onClick={handleUpdate}
              disabled={!selectedTaskId || !date || !priority || !status || submitting}
            >
              {submitting ? 'Updating…' : 'Update Task'}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UpdateTaskForm;
