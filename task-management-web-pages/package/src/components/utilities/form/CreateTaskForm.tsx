import { Icon } from '@iconify/react/dist/iconify.js';
import { useState } from 'react';
import { Button } from 'src/components/ui/button';
import { Calendar } from 'src/components/ui/calendar';
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
import { useAuth } from 'src/context/AuthContext';

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

const CreateTaskForm = () => {
  const { user } = useAuth();

  const [taskName, setTaskName] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const errors = attempted ? {
    taskName: !taskName.trim() ? 'Task Name is required' : '',
    date: !date ? 'Due Date is required' : '',
    priority: !priority ? 'Priority is required' : '',
    status: !status ? 'Status is required' : '',
  } : { taskName: '', date: '', priority: '', status: '' };

  const handleSubmit = async () => {
    setAttempted(true);
    if (!taskName.trim() || !date || !priority || !status || !user) return;
    setSubmitting(true);
    try {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');

      const taskRes = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_name: taskName.trim(),
          due_date: `${y}-${m}-${d}`,
          priority: priority.charAt(0).toUpperCase() + priority.slice(1),
          status: status.charAt(0).toUpperCase() + status.slice(1),
          created_by: user.user_id,
        }),
      });
      if (!taskRes.ok) throw new Error('Failed to create task');
      const { task_id } = await taskRes.json();

      const assignRes = await fetch('/api/task-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id, user_id: user.user_id }),
      });
      if (!assignRes.ok) throw new Error('Failed to assign task');

      setTaskName('');
      setDate(undefined);
      setPriority('');
      setStatus('');
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

          <div className="flex flex-col gap-1">
            <Label htmlFor="due-date" className="px-1">Due Date <span className="text-red-500">*</span></Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  id="due-date"
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
                    setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

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

          <div className="flex justify-end items-center gap-3">
            {submitted && (
              <span className="text-sm text-green-600 font-medium">Task created successfully!</span>
            )}
            <Button
              className="rounded-md whitespace-nowrap"
              onClick={handleSubmit}
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

export default CreateTaskForm;
