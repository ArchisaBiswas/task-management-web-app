import { Icon } from '@iconify/react/dist/iconify.js';
import { useMemo, useState } from 'react';
import { Badge } from 'src/components/ui/badge';
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
import { usePersonalTasks, type PersonalTask } from 'src/context/personal-tasks-context';
import { EmployeesData } from 'src/components/utilities/table/data';

// ── styling maps ──────────────────────────────────────────────────────────────

const priorityColors: Record<string, string> = {
  low: 'bg-primary text-white',
  medium: 'bg-warning text-white',
  high: 'bg-error text-white',
  critical: 'bg-purple-700 text-white',
};

const statusColors: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
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

// ── helpers ──────────────────────────────────────────────────────────────────��

type SelectionKey = `shared::${string}` | `personal::${string}`;

// ── component ─────────────────────────────────────────────────────────────────

const UpdateMyTaskForm = () => {
  const { personalTasks, updatePersonalTask } = usePersonalTasks();

  const [selectedKey, setSelectedKey] = useState<SelectionKey | ''>('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  // editable state — only used for personal tasks
  const [editTaskName, setEditTaskName] = useState('');
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editPriority, setEditPriority] = useState('');
  const [editStatus, setEditStatus] = useState('');

  // editable status — only used for shared tasks
  const [sharedStatus, setSharedStatus] = useState('');
  const [sharedStatusSaved, setSharedStatusSaved] = useState(false);

  // derived: unique shared task names
  const uniqueSharedTasks = useMemo(
    () => [...new Set(EmployeesData.map((r) => r.task))],
    []
  );

  // derived: co-assignees for the selected shared task
  const sharedTaskRows = useMemo(() => {
    if (!selectedKey.startsWith('shared::')) return [];
    const name = selectedKey.replace('shared::', '');
    return EmployeesData.filter((r) => r.task === name);
  }, [selectedKey]);

  // derived: selected personal task object
  const selectedPersonalTask: PersonalTask | undefined = useMemo(() => {
    if (!selectedKey.startsWith('personal::')) return undefined;
    const id = selectedKey.replace('personal::', '');
    return personalTasks.find((t) => t.id === id);
  }, [selectedKey, personalTasks]);

  const handleSelect = (key: string) => {
    setSelectedKey(key as SelectionKey);
    setSaved(false);
    setSharedStatusSaved(false);

    if (key.startsWith('shared::')) {
      const name = key.replace('shared::', '');
      const first = EmployeesData.find((r) => r.task === name);
      if (first) setSharedStatus(first.status.toLowerCase());
    }

    if (key.startsWith('personal::')) {
      const id = key.replace('personal::', '');
      const task = personalTasks.find((t) => t.id === id);
      if (task) {
        setEditTaskName(task.task);
        setEditDate(task.dueDate);
        setEditPriority(task.priority);
        setEditStatus(task.status);
      }
    }
  };

  const handleSave = () => {
    if (!selectedPersonalTask) return;
    updatePersonalTask({
      ...selectedPersonalTask,
      task: editTaskName.trim() || selectedPersonalTask.task,
      dueDate: editDate,
      priority: editPriority,
      status: editStatus,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // ── shared task display (read-only) ─────────────────────────────────────────

  const SharedDisplay = () => {
    if (sharedTaskRows.length === 0) return null;
    const first = sharedTaskRows[0];
    return (
      <div className="flex flex-col gap-5 mt-2">
        {/* Task name */}
        <div>
          <p className="text-xs text-gray-500 dark:text-white/50 mb-1">Task</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{first.task}</p>
        </div>

        {/* Co-Assignees — side by side */}
        <div>
          <p className="text-xs text-gray-500 dark:text-white/50 mb-2">Co-Assignees</p>
          <div className="flex flex-wrap gap-3">
            {sharedTaskRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-lg">
                <img
                  src={row.name.image}
                  width={32}
                  height={32}
                  className="rounded-full shrink-0 object-cover"
                  alt={row.name.text}
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                  {row.name.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div>
          <p className="text-xs text-gray-500 dark:text-white/50 mb-1">Due Date</p>
          <p className="text-sm font-medium text-gray-900 dark:text-white">{first['due date']}</p>
        </div>

        {/* Priority */}
        <div>
          <p className="text-xs text-gray-500 dark:text-white/50 mb-1">Priority</p>
          <Badge className={`text-xs rounded-full py-1 px-3 ${priorityColors[first.priority.toLowerCase()] ?? 'bg-primary text-white'}`}>
            {first.priority}
          </Badge>
        </div>

        {/* Status — editable toggle Active ↔ Completed */}
        <div>
          <Label htmlFor="shared-status">Status</Label>
          <Select value={sharedStatus} onValueChange={setSharedStatus}>
            <SelectTrigger
              id="shared-status"
              className={`mt-2 w-full transition-colors ${sharedStatus ? statusConfig[sharedStatus].triggerCls : 'border-primary data-[placeholder]:text-primary'}`}
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
          {sharedStatusSaved && (
            <span className="text-sm text-green-600 font-medium">Saved!</span>
          )}
          <Button
            className="rounded-md whitespace-nowrap"
            onClick={() => {
              setSharedStatusSaved(true);
              setTimeout(() => setSharedStatusSaved(false), 2000);
            }}
          >
            Update Task
          </Button>
        </div>
      </div>
    );
  };

  // ── personal task edit form ──────────────────────────────────────────────────

  const PersonalEditForm = () => (
    <div className="flex flex-col gap-6 mt-2">
      {/* Task name */}
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

      {/* Due Date */}
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
              onSelect={(d) => {
                setEditDate(d);
                setCalendarOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Priority */}
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

      {/* Status */}
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
        <Button className="rounded-md whitespace-nowrap" onClick={handleSave}>
          Update Task
        </Button>
      </div>
    </div>
  );

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
      <div className="xl:col-span-2 rounded-xl border border-border md:p-6 p-4">
        <h5 className="card-title text-center">Update My Task</h5>
        <div className="mt-6 flex flex-col gap-6">

          {/* Combined task dropdown */}
          <div>
            <Label htmlFor="task-select">Task</Label>
            <Select value={selectedKey} onValueChange={handleSelect}>
              <SelectTrigger
                id="task-select"
                className="mt-2 w-full border-primary data-[placeholder]:text-primary"
              >
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {uniqueSharedTasks.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                      My Tasks
                    </div>
                    {uniqueSharedTasks.map((name) => (
                      <SelectItem key={`shared::${name}`} value={`shared::${name}`}>
                        {name}
                      </SelectItem>
                    ))}
                  </>
                )}
                {personalTasks.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-gray-400 font-semibold uppercase tracking-wide mt-1">
                      Added by Me
                    </div>
                    {personalTasks.map((t) => (
                      <SelectItem key={`personal::${t.id}`} value={`personal::${t.id}`}>
                        {t.task}
                      </SelectItem>
                    ))}
                  </>
                )}
                {uniqueSharedTasks.length === 0 && personalTasks.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-400">No tasks available</div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Conditional display */}
          {selectedKey.startsWith('shared::') && <SharedDisplay />}
          {selectedKey.startsWith('personal::') && selectedPersonalTask && <PersonalEditForm />}
        </div>
      </div>
    </div>
  );
};

export default UpdateMyTaskForm;
