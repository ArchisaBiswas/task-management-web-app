'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Badge } from 'src/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'src/components/ui/table';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';
import { Label } from 'src/components/ui/label';
import { ArrowUp, ArrowDown, ChevronsUpDown, Pencil, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog';
import CardBox from 'src/components/shared/CardBox';

export type CoAssignee = {
  text: string;
  image: string;
  timezone: string;
};

export type EmployeeRow = {
  task_id?: number;
  coAssignees: CoAssignee[];
  task: string;
  'due date': string;
  rawDueDate?: string;
  priority: string;
  status: string;
  all_completed?: boolean;
};

const priorityColors: Record<string, string> = {
  low: 'bg-primary text-white',
  medium: 'bg-warning text-white',
  high: 'bg-error text-white',
  critical: 'bg-purple-700 text-white',
};

const statusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-blue-100 text-blue-700',
};

// Formats the current moment in the given timezone as "h:mm AM/PM" for display in the dialog.
const computeLocalTime = (timezone: string, now: Date): string =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(now);

// Returns 'In-Office' when the local hour in the given timezone falls in the 09:00–17:00 window.
const computeWorkingStatus = (timezone: string, now: Date): string => {
  const hour =
    parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        hour12: false,
      }).format(now),
      10,
    ) % 24;
  return hour >= 9 && hour < 17 ? 'In-Office' : 'Out-of-Office';
};

// Converts an ISO date string ("YYYY-MM-DD") to an ordinal display string ("1st April, 2025")
// using UTC fields so the day is never shifted by the browser's local timezone.
const formatDisplayDate = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00Z');
  const day = d.getUTCDate();
  const suffix =
    day % 10 === 1 && day !== 11 ? 'st' :
    day % 10 === 2 && day !== 12 ? 'nd' :
    day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  const month = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${day}${suffix} ${month}, ${d.getUTCFullYear()}`;
};

interface MyTasksTableProps {
  data?: EmployeeRow[];
  onDataChange?: (data: EmployeeRow[]) => void;
  userId?: number;
  // deletedTaskId is provided on row deletion so the parent can prune its own state.
  onMutation?: (deletedTaskId?: number) => void;
}

// Sortable, paginated, searchable table of the current user's tasks.
// Rows without co-assignees allow full inline editing; shared tasks restrict editing to status only.
export const MyTasksTable = ({ data = [], onDataChange, userId, onMutation }: MyTasksTableProps) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalData, setInternalData] = useState<EmployeeRow[]>(() => [...data]);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);
  const [editTask, setEditTask] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editPriority, setEditPriority] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const [popupNow, setPopupNow] = useState(() => new Date());
  useEffect(() => {
    if (editRowIndex === null) return;
    const id = setInterval(() => setPopupNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [editRowIndex]);

  useEffect(() => {
    if (data.length > 0) setInternalData([...data]);
  }, [data]);

  useEffect(() => {
    onDataChange?.(internalData);
  }, [internalData, onDataChange]);

  // Column definitions are memoised on userId so the delete handler always closes
  // over the latest userId without triggering unnecessary re-renders on unrelated state changes.
  const columns = useMemo<ColumnDef<EmployeeRow, unknown>[]>(() => [
    {
      id: 'task',
      header: 'Task',
      accessorKey: 'task',
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="text-gray-900 dark:text-white font-medium">{String(getValue())}</span>
      ),
    },
    {
      id: 'co-assignees',
      header: 'Co-Assignees',
      accessorFn: (row) => row.coAssignees.map((c) => c.text).join(', '),
      enableSorting: true,
      cell: ({ row }) => {
        const cas = row.original.coAssignees;
        if (cas.length === 0)
          return <span className="text-gray-400 dark:text-white/30 text-sm">—</span>;
        const shown = cas.slice(0, 3);
        const extra = cas.length - shown.length;
        return (
          <div className="flex flex-col gap-1.5">
            <div className="flex -space-x-2">
              {shown.map((ca, i) =>
                ca.image ? (
                  <img
                    key={i}
                    src={ca.image}
                    width={30}
                    height={30}
                    className="rounded-full border-2 border-white dark:border-gray-800 object-cover shrink-0"
                    title={ca.text}
                  />
                ) : (
                  <div
                    key={i}
                    className="w-[30px] h-[30px] rounded-full border-2 border-white dark:border-gray-800 bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0"
                    title={ca.text}
                  >
                    {ca.text.charAt(0).toUpperCase()}
                  </div>
                ),
              )}
              {extra > 0 && (
                <div className="w-[30px] h-[30px] rounded-full border-2 border-white dark:border-gray-800 bg-gray-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  +{extra}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-white/50 leading-tight">
              {shown.map((ca) => ca.text).join(', ')}
              {extra > 0 ? ` +${extra} more` : ''}
            </span>
          </div>
        );
      },
    },
    {
      id: 'due-date',
      header: 'Due Date (GMT)',
      accessorKey: 'due date',
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="text-gray-900 dark:text-white font-medium">{String(getValue())}</span>
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      accessorKey: 'priority',
      enableSorting: true,
      cell: ({ getValue }) => {
        const val = String(getValue());
        const cls = priorityColors[val.toLowerCase()] ?? 'bg-primary text-white';
        return (
          <Badge className={`text-sm rounded-full py-1 px-3 justify-center whitespace-nowrap ${cls}`}>
            {val}
          </Badge>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      accessorKey: 'status',
      enableSorting: true,
      cell: ({ getValue }) => {
        const val = String(getValue());
        const cls = statusColors[val.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
        return (
          <Badge className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>
            {val}
          </Badge>
        );
      },
    },
    {
      id: 'action',
      header: 'Action',
      enableSorting: false,
      cell: ({ row }) => {
        const noCoAssignees = row.original.coAssignees.length === 0;
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="lightprimary"
              className="size-8! rounded-full"
              onClick={() => {
                setEditRowIndex(row.index);
                setEditTask(row.original.task);
                setEditDueDate(row.original.rawDueDate ?? '');
                setEditPriority(row.original.priority);
                setEditStatus(row.original.status);
                setPopupNow(new Date());
              }}
            >
              <Pencil className="size-5" />
            </Button>
            {noCoAssignees && (
              <Button
                size="sm"
                variant="lighterror"
                className="size-8! rounded-full"
                onClick={async () => {
                  const taskId = row.original.task_id;
                  try {
                    // Backend deletes the assignment, then removes the task if no
                    // other assignments remain — so the tasks table stays clean.
                    const res = await fetch('${import.meta.env.VITE_API_URL}/task-assignments', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ task_id: taskId, user_id: userId }),
                    });
                    if (!res.ok) throw new Error('Delete failed');
                    setInternalData((prev) => prev.filter((_, i) => i !== row.index));
                    // Pass taskId so the parent can remove the task from its own state
                    // and prevent it from reappearing via the 60-second overdue check.
                    onMutation?.(taskId);
                  } catch {
                    alert('Failed to delete task. Please try again.');
                  }
                }}
              >
                <Trash2 className="size-5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ], [userId]);

  const table = useReactTable({
    data: internalData,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 5 } },
  });

  const paginationOptions = useMemo(() => [5, 10, 20].filter((s) => s <= data.length), [data.length]);

  const editingRow = editRowIndex !== null ? internalData[editRowIndex] : null;
  const isFullEdit = editingRow !== null && editingRow.coAssignees.length === 0;

  return (
    <>
      <CardBox>
        <div>
          <div className="p-4 pt-0 flex items-center justify-between flex-wrap gap-4">
            <h3 className="text-xl font-semibold mb-2">Tasks Data Table</h3>
            <Input
              type="text"
              className="max-w-96 lg:min-w-96 min-w-full placeholder:text-gray-400 dark:placeholder:text-white/20"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search your relevant items..."
            />
          </div>

          <div className="overflow-x-auto border rounded-md border-ld">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id}>
                    {hg.headers.map((header) => (
                      <TableHead key={header.id} className="cursor-pointer select-none min-w-42 px-0">
                        {header.isPlaceholder ? null : (
                          <Button
                            className="flex items-center gap-1 px-4 bg-transparent hover:bg-transparent text-dark dark:text-white font-semibold"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{
                              asc: <ArrowUp className="w-4 h-4 inline" />,
                              desc: <ArrowDown className="w-4 h-4 inline" />,
                            }[header.column.getIsSorted() as string] ??
                              (header.column.id !== 'action' ? <ChevronsUpDown className="w-2 h-2 inline" /> : null)}
                          </Button>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} className="hover:bg-primary/10 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="text-gray-700 dark:text-white/70">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center p-6 text-gray-500 dark:text-white/70 font-medium">
                      No results found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border dark:border-white/10">
            <div className="flex gap-2">
              <Button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} variant="secondary">
                Previous
              </Button>
              <Button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                Next
              </Button>
            </div>
            <div className="text-forest-black dark:text-white/90 font-medium text-base">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="pageSize" className="text-forest-black dark:text-white/90 text-base font-medium whitespace-nowrap min-w-32">
                Rows per page:
              </Label>
              <Select
                value={String(table.getState().pagination.pageSize)}
                onValueChange={(v) => table.setPageSize(Number(v))}
              >
                <SelectTrigger className="!w-18 cursor-pointer">
                  <SelectValue placeholder="Page size" />
                </SelectTrigger>
                <SelectContent>
                  {paginationOptions.map((s) => (
                    <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardBox>

      {/* Task Detail / Edit Dialog */}
      <Dialog open={editRowIndex !== null} onOpenChange={(open) => { if (!open) setEditRowIndex(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="mb-2">Task Details</DialogTitle>
          </DialogHeader>
          {editingRow !== null && (
            <div className="flex flex-col gap-4">

              {/* Task */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-task">Task</Label>
                {isFullEdit ? (
                  <Input
                    id="edit-task"
                    value={editTask}
                    onChange={(e) => setEditTask(e.target.value)}
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{editingRow.task}</p>
                )}
              </div>

              {/* Due Date & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-due-date">Due Date</Label>
                  {isFullEdit ? (
                    <input
                      id="edit-due-date"
                      type="date"
                      value={editDueDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{editingRow['due date']}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="edit-priority">Priority</Label>
                  {isFullEdit ? (
                    <Select value={editPriority} onValueChange={setEditPriority}>
                      <SelectTrigger id="edit-priority" className="w-full">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={`text-xs rounded-full py-1 px-3 w-fit ${priorityColors[editingRow.priority.toLowerCase()] ?? 'bg-primary text-white'}`}>
                      {editingRow.priority}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Current Status (read-only badge) — only shown when has co-assignees */}
              {!isFullEdit && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-white/50 mb-1">Current Status</p>
                  <Badge className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[editingRow.status.toLowerCase()] ?? 'bg-gray-100 text-gray-700'}`}>
                    {editingRow.status}
                  </Badge>
                </div>
              )}

              {/* Co-Assignees — only shown when row has co-assignees */}
              {editingRow.coAssignees.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-white/50 mb-2">Co-Assignees</p>
                  <div className="flex flex-col gap-2">
                    {editingRow.coAssignees.map((ca, i) => {
                      const localTime = computeLocalTime(ca.timezone, popupNow);
                      const workingStatus = computeWorkingStatus(ca.timezone, popupNow);
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-white/5 rounded-lg"
                        >
                          {ca.image ? (
                            <img
                              src={ca.image}
                              width={38}
                              height={38}
                              className="rounded-full shrink-0 object-cover"
                              alt={ca.text}
                            />
                          ) : (
                            <div className="w-[38px] h-[38px] rounded-full shrink-0 bg-primary flex items-center justify-center text-white text-sm font-bold">
                              {ca.text.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                              {ca.text}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-white/50 tabular-nums">
                              {localTime}
                              <span
                                className={`ml-2 font-medium ${
                                  workingStatus === 'In-Office' ? 'text-green-600' : 'text-gray-400'
                                }`}
                              >
                                · {workingStatus}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="status-select">{isFullEdit ? 'Status' : 'Update Status'}</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger id="status-select" className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 mt-4">
            <Button
              className="rounded-md"
              disabled={saving}
              onClick={async () => {
                if (editRowIndex === null || editingRow === null) return;
                const taskId = editingRow.task_id;
                setSaving(true);
                try {
                  // Update task-level fields only when no co-assignees (full edit)
                  if (isFullEdit) {
                    const res = await fetch(`${import.meta.env.VITE_API_URL}/tasks/${taskId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ task_name: editTask, due_date: editDueDate, priority: editPriority }),
                    });
                    if (!res.ok) throw new Error('Failed to update task');
                  }

                  // Always update this user's status individually
                  const statusRes = await fetch(`${import.meta.env.VITE_API_URL}/task-assignments/${taskId}/users/${userId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: editStatus }),
                  });
                  if (!statusRes.ok) throw new Error('Failed to update status');

                  setInternalData((prev) => {
                    const updated = [...prev];
                    updated[editRowIndex] = isFullEdit
                      ? {
                          ...updated[editRowIndex],
                          task: editTask,
                          'due date': editDueDate ? formatDisplayDate(editDueDate) : updated[editRowIndex]['due date'],
                          rawDueDate: editDueDate,
                          priority: editPriority,
                          status: editStatus,
                        }
                      : { ...updated[editRowIndex], status: editStatus };
                    return updated;
                  });
                  onMutation?.();
                  setEditRowIndex(null);
                } catch {
                  alert('Failed to update task. Please try again.');
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button
              className="rounded-md bg-lighterror dark:bg-darkerror text-error hover:bg-error hover:text-white"
              onClick={() => setEditRowIndex(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
