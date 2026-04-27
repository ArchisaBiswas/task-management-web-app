import { Icon } from '@iconify/react/dist/iconify.js';
import { useEffect, useState } from 'react';
import { Button } from 'src/components/ui/button';
import { Calendar } from 'src/components/ui/calendar';
import { Checkbox } from 'src/components/ui/checkbox';
import { Input } from 'src/components/ui/input';
import { Label } from 'src/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from 'src/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';

type DbUser = { user_id: number; name: string; timezone: string };
type UserOption = DbUser & { officeStatus: 'In-Office' | 'Out-of-Office' };

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

const Form = () => {
  const [taskName, setTaskName] = useState('');
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<number[]>([]);
  const [assigneesOpen, setAssigneesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    fetch('${import.meta.env.VITE_API_URL}/users')
      .then((r) => r.json())
      .then((data: DbUser[]) =>
        setUsers(data.map((u) => ({ ...u, officeStatus: getOfficeStatus(u.timezone) }))),
      )
      .catch(console.error);
  }, []);

  const toggleAssignee = (userId: number) =>
    setSelectedAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );

  const errors = attempted ? {
    taskName: !taskName.trim() ? 'Task Name is required' : '',
    assignees: selectedAssigneeIds.length === 0 ? 'Please select at least one assignee' : '',
    date: !date ? 'Due Date is required' : '',
    priority: !priority ? 'Priority is required' : '',
    status: !status ? 'Status is required' : '',
  } : { taskName: '', assignees: '', date: '', priority: '', status: '' };

  const handleCreate = async () => {
    setAttempted(true);
    if (!taskName.trim() || !date || !priority || !status || selectedAssigneeIds.length === 0) return;
    setSubmitting(true);
    try {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');

      const taskRes = await fetch('${import.meta.env.VITE_API_URL}/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_name: taskName.trim(),
          due_date: `${y}-${m}-${d}`,
          priority: priority.charAt(0).toUpperCase() + priority.slice(1),
          status: status.charAt(0).toUpperCase() + status.slice(1),
        }),
      });
      if (!taskRes.ok) throw new Error('Failed to create task');
      const { task_id } = await taskRes.json();

      await Promise.all(
        selectedAssigneeIds.map((userId) =>
          fetch('${import.meta.env.VITE_API_URL}/task-assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_id, user_id: userId }),
          }),
        ),
      );

      setTaskName('');
      setDate(undefined);
      setPriority('');
      setStatus('');
      setSelectedAssigneeIds([]);
      setAttempted(false);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to create task. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
      <div className="xl:col-span-2 rounded-xl border border-border md:p-6 p-4">
        <h5 className="card-title text-center">Let's Create A Task</h5>
        <div className="mt-6 flex flex-col gap-6">

          {/* Task Name */}
          <div>
            <Label htmlFor="task">Task <span className="text-red-500">*</span></Label>
            <Input
              id="task"
              type="text"
              placeholder="Enter task name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className={`mt-2 border-primary placeholder:text-primary ${errors.taskName ? 'border-red-500' : ''}`}
            />
            {errors.taskName && <p className="text-xs text-red-500 mt-1">{errors.taskName}</p>}
          </div>

          {/* Assignees */}
          <div>
            <Label>Assignees <span className="text-red-500">*</span></Label>
            <Popover open={assigneesOpen} onOpenChange={setAssigneesOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`mt-2 w-full justify-between font-normal hover:bg-transparent focus:border-primary ${errors.assignees ? 'border-red-500' : ''}`}
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
                {users.length === 0 ? (
                  <p className="text-sm text-gray-500 px-3 py-2">Loading users…</p>
                ) : (
                  users.map((user) => (
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
                  ))
                )}
              </PopoverContent>
            </Popover>
            {errors.assignees && <p className="text-xs text-red-500 mt-1">{errors.assignees}</p>}
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-1">
            <Label htmlFor="date" className="px-1">Due Date <span className="text-red-500">*</span></Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="date"
                  className={`w-full justify-between font-normal hover:bg-transparent focus:border-primary ${errors.date ? 'border-red-500' : ''}`}
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
                    setOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="priority">Priority <span className="text-red-500">*</span></Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger
                id="priority"
                className={`mt-2 w-full transition-colors ${priority ? priorityConfig[priority].triggerCls : `border-primary data-[placeholder]:text-primary ${errors.priority ? 'border-red-500' : ''}`}`}
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
            {errors.priority && <p className="text-xs text-red-500 mt-1">{errors.priority}</p>}
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status <span className="text-red-500">*</span></Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger
                id="status"
                className={`mt-2 w-full transition-colors ${status ? statusConfig[status].triggerCls : `border-primary data-[placeholder]:text-primary ${errors.status ? 'border-red-500' : ''}`}`}
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
            {errors.status && <p className="text-xs text-red-500 mt-1">{errors.status}</p>}
          </div>

          {/* Submit */}
          <div className="flex justify-end items-center gap-3">
            {submitted && (
              <span className="text-sm text-green-600 font-medium">Task created successfully!</span>
            )}
            <Button
              className="rounded-md whitespace-nowrap"
              onClick={handleCreate}
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create Task'}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Form;
