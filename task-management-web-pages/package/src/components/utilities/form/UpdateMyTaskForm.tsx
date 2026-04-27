import { Icon } from '@iconify/react/dist/iconify.js';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from 'src/components/ui/badge';
import { Button } from 'src/components/ui/button';
import { Calendar } from 'src/components/ui/calendar';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from 'src/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';
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

// ── types ─────────────────────────────────────────────────────────────────────

type CoAssignee = { user_id: number; name: string; timezone: string };

type ApiTask = {
  task_id: number;
  task_name: string;
  due_date: string;
  priority: string;
  status: string;
  created_by: number | null;
  co_assignees: CoAssignee[];
};

// ── styling maps ──────────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  low: 'bg-primary text-white',
  medium: 'bg-warning text-white',
  high: 'bg-error text-white',
  critical: 'bg-purple-700 text-white',
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

// ── helpers ───────────────────────────────────────────────────────────────────

const formatDueDate = (raw: string): string => {
  const [y, m, d] = raw.split('T')[0].split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? 'st' :
    day % 10 === 2 && day !== 12 ? 'nd' :
    day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  const month = date.toLocaleString('en-US', { month: 'long' });
  return `${day}${suffix} ${month}, ${date.getFullYear()}`;
};

const parseApiDate = (raw: string): Date => {
  const [y, m, d] = raw.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};

const toApiDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ── component ─────────────────────────────────────────────────────────────────

const UpdateMyTaskForm = () => {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // edit state — "created by me" tasks
  const [editTaskName, setEditTaskName] = useState('');
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editPriority, setEditPriority] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // edit state — "assigned to me" tasks (status only)
  const [assignedStatus, setAssignedStatus] = useState('');

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/my-tasks/${user.user_id}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json() as Promise<ApiTask[]>;
      })
      .then((data) => { setTasks(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.task_id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const isOwned = selectedTask !== null && selectedTask.created_by === user?.user_id;

  const createdByMe = useMemo(
    () => tasks.filter((t) => t.created_by === user?.user_id),
    [tasks, user],
  );
  const assignedToMe = useMemo(
    () => tasks.filter((t) => t.created_by !== user?.user_id),
    [tasks, user],
  );

  const handleSelect = (idStr: string) => {
    const id = Number(idStr);
    setSelectedTaskId(id);
    setSaved(false);
    const task = tasks.find((t) => t.task_id === id);
    if (!task) return;
    if (task.created_by === user?.user_id) {
      setEditTaskName(task.task_name);
      setEditDate(parseApiDate(task.due_date));
      setEditPriority(task.priority.toLowerCase());
      setEditStatus(task.status.toLowerCase());
    } else {
      setAssignedStatus(task.status.toLowerCase());
    }
  };

  const handleSave = async () => {
    if (!selectedTask) return;

    let payload: Record<string, unknown>;
    let changed = false;

    if (isOwned) {
      const newPriority = editPriority.charAt(0).toUpperCase() + editPriority.slice(1);
      const newStatus = editStatus.charAt(0).toUpperCase() + editStatus.slice(1);
      const newDueDate = editDate ? toApiDate(editDate) : selectedTask.due_date.split('T')[0];
      changed =
        editTaskName.trim() !== selectedTask.task_name ||
        newDueDate !== selectedTask.due_date.split('T')[0] ||
        newPriority !== selectedTask.priority ||
        newStatus !== selectedTask.status;
      payload = { task_name: editTaskName.trim(), due_date: newDueDate, priority: newPriority, status: newStatus };
    } else {
      const newStatus = assignedStatus.charAt(0).toUpperCase() + assignedStatus.slice(1);
      changed = newStatus !== selectedTask.status;
      payload = { status: newStatus };
    }

    if (!changed) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${selectedTask.task_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update task');

      setTasks((prev) =>
        prev.map((t) =>
          t.task_id !== selectedTask.task_id ? t :
          isOwned
            ? { ...t, task_name: payload.task_name as string, due_date: payload.due_date as string, priority: payload.priority as string, status: payload.status as string }
            : { ...t, status: payload.status as string },
        ),
      );

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('Failed to update task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
      <div className="xl:col-span-2 rounded-xl border border-border md:p-6 p-4">
        <h5 className="card-title text-center">Update My Task</h5>

        {loading ? (
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-white/50">Loading tasks…</p>
        ) : tasks.length === 0 ? (
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-white/50">No tasks assigned to you yet.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-6">

            {/* ── Task dropdown with subsections ── */}
            <div>
              <Label htmlFor="task-select">Task</Label>
              <Select
                value={selectedTaskId !== null ? String(selectedTaskId) : ''}
                onValueChange={handleSelect}
              >
                <SelectTrigger
                  id="task-select"
                  className="mt-2 w-full border-primary data-[placeholder]:text-primary"
                >
                  <SelectValue placeholder="Select a task" />
                </SelectTrigger>
                <SelectContent>
                  {createdByMe.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400 py-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                        Created by Me
                      </SelectLabel>
                      {createdByMe.map((t) => (
                        <SelectItem key={t.task_id} value={String(t.task_id)}>
                          {t.task_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}

                  {createdByMe.length > 0 && assignedToMe.length > 0 && (
                    <SelectSeparator className="my-1" />
                  )}

                  {assignedToMe.length > 0 && (
                    <SelectGroup>
                      <SelectLabel className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-orange-500 dark:text-orange-400 py-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500 dark:bg-orange-400 shrink-0" />
                        Assigned to Me
                      </SelectLabel>
                      {assignedToMe.map((t) => (
                        <SelectItem key={t.task_id} value={String(t.task_id)}>
                          {t.task_name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* ── Created by Me: task name + due date + priority editable ── */}
            {selectedTask && isOwned && (
              <div className="flex flex-col gap-6">

                <div>
                  <Label htmlFor="edit-task">Task Name</Label>
                  <Input
                    id="edit-task"
                    type="text"
                    value={editTaskName}
                    onChange={(e) => setEditTaskName(e.target.value)}
                    className="mt-2 border-primary"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <Label htmlFor="edit-due-date" className="px-1">Due Date</Label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id="edit-due-date"
                        className="w-full justify-between font-normal hover:bg-transparent focus:border-primary"
                      >
                        {editDate ? editDate.toLocaleDateString() : 'Select date'}
                        <Icon icon="solar:calendar-minimalistic-linear" width={18} height={18} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={editDate}
                        captionLayout="dropdown"
                        disabled={(day) => day < new Date(new Date().setHours(0, 0, 0, 0))}
                        onSelect={(d) => { setEditDate(d); setCalendarOpen(false); }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select value={editPriority} onValueChange={setEditPriority}>
                    <SelectTrigger
                      id="edit-priority"
                      className={`mt-2 w-full transition-colors ${editPriority ? priorityConfig[editPriority].triggerCls : 'border-primary data-[placeholder]:text-primary'}`}
                    >
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['low', 'medium', 'high', 'critical'] as const).map((level) => (
                        <SelectItem key={level} value={level}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${priorityConfig[level].dotCls}`} />
                            <span className="capitalize">{level}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Status — editable */}
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger
                      id="edit-status"
                      className={`mt-2 w-full transition-colors ${editStatus ? statusConfig[editStatus].triggerCls : 'border-primary data-[placeholder]:text-primary'}`}
                    >
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['active', 'pending', 'completed'] as const).map((s) => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConfig[s].dotCls}`} />
                            <span className="capitalize">{s}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end items-center gap-3">
                  {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
                  <Button
                    className="rounded-md whitespace-nowrap"
                    disabled={saving || !editTaskName.trim() || !editDate}
                    onClick={handleSave}
                  >
                    {saving ? 'Saving…' : 'Update Task'}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Assigned to Me: all fields read-only, status editable ── */}
            {selectedTask && !isOwned && (
              <div className="flex flex-col gap-5">

                <div>
                  <p className="text-xs text-gray-500 dark:text-white/50 mb-1">Task</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTask.task_name}</p>
                </div>

                {selectedTask.co_assignees.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-white/50 mb-2">Co-Assignees</p>
                    <div className="flex flex-wrap gap-3">
                      {selectedTask.co_assignees.map((ca) => (
                        <div key={ca.user_id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                          <img
                            src={userImages[(ca.user_id - 1) % userImages.length]}
                            width={32}
                            height={32}
                            className="rounded-full shrink-0 object-cover"
                            alt={ca.name}
                          />
                          <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                            {ca.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500 dark:text-white/50 mb-1">Due Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatDueDate(selectedTask.due_date)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 dark:text-white/50 mb-1">Priority</p>
                  <Badge className={`text-xs rounded-full py-1 px-3 ${priorityColors[selectedTask.priority.toLowerCase()] ?? 'bg-primary text-white'}`}>
                    {selectedTask.priority}
                  </Badge>
                </div>

                {/* Status — editable, Active ↔ Completed only */}
                <div>
                  <Label htmlFor="assigned-status">Status</Label>
                  <Select value={assignedStatus} onValueChange={setAssignedStatus}>
                    <SelectTrigger
                      id="assigned-status"
                      className={`mt-2 w-full transition-colors ${assignedStatus ? statusConfig[assignedStatus].triggerCls : 'border-primary data-[placeholder]:text-primary'}`}
                    >
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['active', 'completed'] as const).map((s) => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConfig[s].dotCls}`} />
                            <span className="capitalize">{s}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end items-center gap-3">
                  {saved && <span className="text-sm text-green-600 font-medium">Saved!</span>}
                  <Button
                    className="rounded-md whitespace-nowrap"
                    disabled={saving}
                    onClick={handleSave}
                  >
                    {saving ? 'Saving…' : 'Update Task'}
                  </Button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateMyTaskForm;
