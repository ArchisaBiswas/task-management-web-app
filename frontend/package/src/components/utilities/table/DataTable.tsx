'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table';
import { Badge } from 'src/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'src/components/ui/table';
import type { CellContext, ColumnDef, SortingState } from '@tanstack/react-table';
import { Input } from 'src/components/ui/input';
import { Button } from 'src/components/ui/button';
import { Icon } from '@iconify/react/dist/iconify.js';
import { ArrowUp, ArrowDown, ChevronsUpDown, Trash2, Pencil } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'src/components/ui/select';
import { Label } from 'src/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'src/components/ui/dialog';
import { Calendar } from 'src/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from 'src/components/ui/popover';
import CardBox from '../../shared/CardBox';

const badgeColors = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-yellow-100 text-yellow-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
];

export function getColorForValue(value: string) {
  const index =
    Math.abs(value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) %
    badgeColors.length;
  return badgeColors[index];
}

export function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function flattenRow(row: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    if (typeof val === 'string' || typeof val === 'number') {
      result[key] = String(val);
    } else if (typeof val === 'object' && val !== null) {
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        if (
          typeof subVal === 'string' &&
          !subKey.toLowerCase().includes('image') &&
          !/\.(jpg|jpeg|png|svg|gif|webp)$/i.test(subVal)
        ) {
          result[`${key}.${subKey}`] = subVal;
        }
      }
    }
  }
  return result;
}

function parseDueDate(str: string): Date | null {
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  };
  const cleaned = str.replace(/(\d+)(st|nd|rd|th)/i, '$1').trim();
  const parts = cleaned.split(/[\s,]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const day = parseInt(parts[0]);
  const month = months[parts[1].toLowerCase()];
  const year = parseInt(parts[2]);
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day);
}


interface DynamicTableProps<T> {
  data?: T[];
  onDataChange?: (data: T[]) => void;
  hiddenColumns?: string[];
  // deletedTaskId + deletedUserId identify the exact row removed; both undefined for edits.
  onMutation?: (deletedTaskId?: number, deletedUserId?: number) => void;
}

export const DataTable = <T extends Record<string, unknown>>({
  data = [],
  onDataChange,
  hiddenColumns = [],
  onMutation,
}: DynamicTableProps<T>) => {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalData, setInternalData] = useState<T[]>(() => [...data]);
  const [editRowIndex, setEditRowIndex] = useState<number | null>(null);

  const prevIdsRef = useRef<string>('');
  useEffect(() => {
    const newIds = data.map((r) => String((r as any).task_id ?? '')).join(',');
    if (newIds !== prevIdsRef.current) {
      // Underlying tasks changed — full reset
      prevIdsRef.current = newIds;
      setInternalData([...data]);
    } else {
      // Only time-display fields changed — patch in place to preserve local edits
      setInternalData((prev) =>
        prev.map((prevRow, i) => {
          const incoming = data[i];
          if (!incoming) return prevRow;
          return {
            ...prevRow,
            'local time': incoming['local time'] ?? prevRow['local time'],
            'working hour status': incoming['working hour status'] ?? prevRow['working hour status'],
          };
        })
      );
    }
  }, [data]);

  useEffect(() => {
    onDataChange?.(internalData);
  }, [internalData, onDataChange]);

  useEffect(() => {
    const autoUpdateStatus = () => {
      const now = new Date();
      setInternalData((prev) => {
        let changed = false;
        const updated = prev.map((row) => {
          const r = row as Record<string, unknown>;
          const statusLower = String(r.status ?? '').toLowerCase();
          if (statusLower === 'completed' || statusLower === 'pending') return row;
          const localDate = parseDueDate(String(r['due date'] ?? ''));
          if (!localDate) return row;
          const endOfDayGMT = new Date(Date.UTC(
            localDate.getFullYear(), localDate.getMonth(), localDate.getDate() + 1,
          ));
          if (now >= endOfDayGMT) {
            changed = true;
            return { ...r, status: 'Pending' } as unknown as T;
          }
          return row;
        });
        return changed ? updated : prev;
      });
    };

    autoUpdateStatus();
    const interval = setInterval(autoUpdateStatus, 60_000);
    return () => clearInterval(interval);
  }, []);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [calendarOpen, setCalendarOpen] = useState<string | null>(null);

  const today = new Date(new Date().setHours(0, 0, 0, 0));

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const dropdownOptions: Record<string, string[]> = {
    'working hour status': ['In-Office', 'Out-of-Office'],
    'priority': ['Low', 'Medium', 'High', 'Critical'],
    'status': ['Active', 'Pending', 'Completed'],
  };

  const renderValue = (val: unknown): React.ReactNode => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  };

  const paginationOptions = useMemo(() => {
    const sizes = [5, 10, 20, 50];
    return sizes.filter((size) => size <= data.length);
  }, [data.length]);

  const columns = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!data.length) return [];

    const keys = Object.keys(data[0]).filter((key) => {
      const val = data[0][key];
      return !Array.isArray(val) && !hiddenColumns.includes(key);
    });

    const baseColumns = keys.map((col) => ({
      accessorKey: col,
      header: col === 'due date' ? 'Due Date (GMT)' : toTitleCase(col.replace(/([A-Z])/g, ' $1').trim()),
      cell: (info: CellContext<T, unknown>) => {
        const value = info.getValue();

        if (col.toLowerCase() === 'priority') {
          const priorityColors: Record<string, string> = {
            low: 'bg-primary text-white',
            medium: 'bg-warning text-white',
            high: 'bg-error text-white',
            critical: 'bg-purple-700 text-white',
          };
          const cls = priorityColors[String(value).toLowerCase()] ?? 'bg-primary text-white';
          return (
            <Badge className={`text-sm rounded-full py-1 px-3 justify-center whitespace-nowrap ${cls}`}>
              {renderValue(value)}
            </Badge>
          );
        }

        if (
          ['status', 'availability', 'gender', 'category', 'genre', 'position'].some((key) =>
            col.toLowerCase().includes(key),
          )
        ) {
          const statusColors: Record<string, string> = {
            completed: 'bg-green-100 text-green-700',
            pending: 'bg-yellow-100 text-yellow-700',
            active: 'bg-blue-100 text-blue-700',
          };
          const cls = statusColors[String(value).toLowerCase()] ?? getColorForValue(String(value));

          return (
            <Badge
              className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}
            >
              {renderValue(value)}
            </Badge>
          );
        }

        if (col.toLowerCase().includes('rating')) {
          const ratingValue = Number(value) || 0;
          const maxRating = 5;
          const fullStars = Math.floor(ratingValue);
          const halfStar = ratingValue % 1 >= 0.5;
          const emptyStars = maxRating - fullStars - (halfStar ? 1 : 0);

          return (
            <div className="flex items-center gap-0.5">
              {[...Array(fullStars)].map((_, i) => (
                <Icon
                  key={`full-${i}`}
                  icon="mdi:star"
                  className="text-[#f3d55b] w-6 h-6 shrink-0"
                />
              ))}
              {halfStar && (
                <Icon icon="mdi:star-half-full" className="text-[#f3d55b] w-6 h-6 shrink-0" />
              )}
              {[...Array(emptyStars)].map((_, i) => (
                <Icon
                  key={`empty-${i}`}
                  icon="mdi:star-outline"
                  className="text-[#f3d55b] w-6 h-6 shrink-0"
                />
              ))}
            </div>
          );
        }

        if (typeof value === 'boolean') {
          return value ? (
            <Badge className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
              Inactive
            </Badge>
          ) : (
            <Badge className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              Active
            </Badge>
          );
        }

        if (col.toLowerCase().includes('id')) {
          return (
            <span className="text-gray-900 dark:text-white font-medium max-w-50 truncate whitespace-nowrap">
              {renderValue(value)}
            </span>
          );
        }

        if (typeof value === 'object' && value !== null) {
          const typedValue = value as Record<string, unknown>;
          const {
            image,
            imageUrl,
            thumbnailUrl,
            thumbnail,
            image_url,
            avatar,
            qrCode,
            profileImage,
            icon,
            ...rest
          } = typedValue;
          const keys = Object.keys(rest);

          return (
            <div className="flex items-center gap-2">
              {image ||
              imageUrl ||
              thumbnailUrl ||
              thumbnail ||
              image_url ||
              avatar ||
              qrCode ||
              profileImage ||
              icon ? (
                <img
                  src={
                    (image as string) ??
                    (imageUrl as string) ??
                    (thumbnailUrl as string) ??
                    (thumbnail as string) ??
                    (image_url as string) ??
                    (avatar as string) ??
                    (qrCode as string) ??
                    (profileImage as string) ??
                    (icon as string)
                  }
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              ) : (
                <Badge className="size-10 flex items-center justify-center rounded-full shrink-0">
                  {keys[0] ? String(rest[keys[0]])[0]?.toUpperCase() : '?'}
                </Badge>
              )}
              <div className="flex flex-col">
                {keys.map((k) => {
                  const val = rest[k];
                  let displayValue;

                  const isTimestamp = (v: unknown) => {
                    if (typeof v !== 'string') return false;
                    return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v);
                  };
                  if (isTimestamp(val)) return null;

                  if (typeof val === 'object' && val !== null) {
                    if ('lat' in val && 'lng' in val) {
                      displayValue = `${val.lat}, ${val.lng}`;
                    } else {
                      displayValue = JSON.stringify(val);
                    }
                  } else {
                    displayValue = val ?? '-';
                  }

                  return (
                    <span
                      key={k}
                      className={
                        k === 'name'
                          ? 'text-gray-900 dark:text-white font-semibold max-w-50 truncate whitespace-nowrap pe-6'
                          : 'text-sm text-gray-500 dark:text-gray-400 max-w-50 truncate whitespace-nowrap pe-6'
                      }
                    >
                      {renderValue(displayValue)}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        }

        if (typeof value === 'string') {
          if (
            value?.includes('png') ||
            value?.includes('jpg') ||
            value?.includes('jpeg') ||
            value?.includes('svg') ||
            col.toLowerCase().includes('thumbnail') ||
            col.toLowerCase().includes('image')
          ) {
            return <img src={value} className="size-10 rounded-md" />;
          }
        }

        if (
          ['user', 'product', 'fullname', 'name', 'author'].some((key) =>
            col.toLowerCase().includes(key),
          )
        ) {
          const cls = getColorForValue(String(value));
          return (
            <div className="flex items-center gap-2">
              <Badge
                className={`size-10 flex items-center justify-center rounded-full shrink-0 ${cls}`}
              >
                {value ? String(value)[0]?.toUpperCase() : '?'}
              </Badge>
              <span className="text-gray-900 dark:text-white font-semibold max-w-50 truncate whitespace-nowrap">
                {renderValue(value)}
              </span>
            </div>
          );
        }

        return (
          <span className="text-gray-900 dark:text-white font-medium max-w-50 truncate block ">
            {renderValue(value)}
          </span>
        );
      },
      enableSorting: true,
      enableGlobalFilter: true,
    }));

    const actionColumn: ColumnDef<T, unknown> = {
      id: 'action',
      header: 'Action',
      enableSorting: false,
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <Button
              size={'sm'}
              variant={'lightprimary'}
              className="size-8! rounded-full"
              onClick={() => {
                setEditRowIndex(row.index);
                setEditValues(flattenRow(row.original as Record<string, unknown>));
              }}
            >
              <Pencil className="size-5" />
            </Button>
            <Button
              size={'sm'}
              variant={'lighterror'}
              className="size-8! rounded-full"
              onClick={async () => {
                const rowData = row.original as Record<string, unknown>;
                const taskId = Number(rowData.task_id);
                const userId = Number(rowData.user_id);

                try {
                  // Remove this user's assignment. The backend then checks whether
                  // any other assignees remain; if none do, it also deletes the task.
                  const res = await fetch("/api/task-assignments", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ task_id: taskId, user_id: userId }),
                  });

                  if (!res.ok) throw new Error("Delete failed");

                  setInternalData((prev) => prev.filter((_, i) => i !== row.index));
                  onMutation?.(taskId, userId);
                } catch (err) {
                  console.error(err);
                  alert("Failed to delete task");
                }
              }}
            >
              <Trash2 className="size-5" />
            </Button>
          </div>
        );
      },
    };

    return [...baseColumns, actionColumn];
  }, [data, setEditRowIndex, setEditValues]);

  // React Table Setup
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
    autoResetPageIndex: false,
    initialState: { pagination: { pageSize: paginationOptions[0] || 5 } },
  });

  // CSV Download
  const handleDownload = () => {
    if (!data.length) return;

    const headers = columns.map((col) => String(col.header));
    const rows = data.map((item) =>
      columns.map((col) => {
        const column = col as unknown as { accessorKey?: string };
        const accessorKey = column.accessorKey;
        const value = accessorKey ? item[accessorKey] : '';
        if (Array.isArray(value)) return `"[array]"`;
        return `"${String(value ?? '').replace(/"/g, '""')}"`;
      }),
    );

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'table-data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
    <CardBox>
      <div>
        {data.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No data available.</p>
        ) : (
          <>
            {/* Search + Download */}
            <div className="p-4 pt-0 flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-xl font-semibold mb-2">Tasks Data Table</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  type="text"
                  className="max-w-96 lg:min-w-96 min-w-full placeholder:text-gray-400 dark:placeholder:text-white/20"
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  placeholder="Search your relevant items..."
                />
                <Button onClick={handleDownload} className="p-2 px-4 rounded-md ">
                  <Icon icon="material-symbols:download-rounded" width={24} height={24} />
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border rounded-md border-ld">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="">
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="cursor-pointer select-none min-w-42 px-0"
                        >
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
                                (header.column.id !== 'action' ? (
                                  <ChevronsUpDown className="w-2 h-2 inline" />
                                ) : null)}
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
                      <TableCell
                        colSpan={columns.length}
                        className="text-center p-6 text-gray-500 dark:text-white/70 font-medium"
                      >
                        No results found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border dark:border-white/10">
              <div className="flex gap-2">
                <Button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  variant={'secondary'}
                  //   className="disabled:bg-gray-300 dark:disabled:bg-white/30 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  //   className="disabled:bg-gray-300 dark:disabled:bg-white/30 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600"
                >
                  Next
                </Button>
              </div>

              <div className="text-forest-black dark:text-white/90 font-medium text-base">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </div>

              <div className="flex items-center gap-2">
                <Label
                  htmlFor="pageSize"
                  className="mr-0 text-forest-black dark:text-white/90 text-base font-medium whitespace-nowrap min-w-32"
                >
                  Rows per page:
                </Label>
                <Select
                  value={String(table.getState().pagination.pageSize)}
                  onValueChange={(value) => table.setPageSize(Number(value))}
                >
                  <SelectTrigger className="!w-18 cursor-pointer">
                    <SelectValue placeholder="Page size" />
                  </SelectTrigger>
                  <SelectContent>
                    {paginationOptions.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </>
        )}
      </div>
    </CardBox>

    <Dialog open={editRowIndex !== null} onOpenChange={(open) => { if (!open) setEditRowIndex(null); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="mb-4">Edit Row</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Object.entries(editValues).filter(([key]) => !hiddenColumns.includes(key)).map(([key, val]) => {
            const isDate = key.toLowerCase().includes('date');
            const isReadOnly = ['name.text', 'name', 'local time', 'working hour status'].includes(key.toLowerCase());
            const options = dropdownOptions[key.toLowerCase()];
            const rawLabel = key.includes('.') && key.split('.')[1] === 'text'
              ? key.split('.')[0]
              : key.replace('.', ' › ');
            const label = toTitleCase(rawLabel.replace(/([A-Z])/g, ' $1').trim());
            return (
              <div key={key} className="flex flex-col gap-2">
                <Label htmlFor={key}>{label}</Label>
                {isReadOnly ? (
                  <p className="text-sm font-medium text-gray-900 dark:text-white py-2">{val}</p>
                ) : options ? (
                  <Select
                    value={val}
                    onValueChange={(v) => setEditValues((prev) => ({ ...prev, [key]: v }))}
                  >
                    <SelectTrigger id={key} className="w-full">
                      <SelectValue placeholder={`Select ${label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : isDate ? (
                  <Popover
                    open={calendarOpen === key}
                    onOpenChange={(open) => setCalendarOpen(open ? key : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id={key}
                        className="w-full justify-between font-normal hover:bg-transparent focus:border-primary"
                      >
                        {val || 'Select date'}
                        <Icon icon="solar:calendar-minimalistic-linear" width={18} height={18} />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown"
                        disabled={(day) => day < today}
                        onSelect={(date) => {
                          if (date) {
                            setEditValues((prev) => ({ ...prev, [key]: formatDate(date) }));
                          }
                          setCalendarOpen(null);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    id={key}
                    value={val}
                    onChange={(e) => setEditValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                )}
              </div>
            );
          })}

        </div>
        <DialogFooter className="flex gap-2 mt-4">
          <Button
            className="rounded-md"
            // onClick={() => {
            //   if (editRowIndex === null) return;
            //   const savedRow = applyEdits(internalData[editRowIndex], editValues) as T;
            //   setInternalData((prev) => {
            //     const updated = [...prev];
            //     updated[editRowIndex] = savedRow;
            //     return updated;
            //   });
            //   onRowSave?.(savedRow);
            //   setEditRowIndex(null);
            // }
            onClick={async () => {
              if (editRowIndex === null) return;

              const row = internalData[editRowIndex] as any;

              try {
                // Update task-level fields (name, priority, due_date)
                const taskPayload = {
                  task_name: editValues.task ?? row.task,
                  due_date: row.due_date,
                  priority: editValues.priority ?? row.priority,
                };
                const taskRes = await fetch(
                  `/api/tasks/${row.task_id}`,
                  { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(taskPayload) }
                );
                if (!taskRes.ok) throw new Error("Task update failed");

                // Update this assignee's status individually
                if (editValues.status !== undefined) {
                  const statusRes = await fetch(
                    `/api/task-assignments/${row.task_id}/users/${row.user_id}`,
                    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: editValues.status }) }
                  );
                  if (!statusRes.ok) throw new Error("Status update failed");
                }

                setInternalData((prev) => {
                  const updated = [...prev];
                  updated[editRowIndex] = { ...row, ...editValues };
                  return updated;
                });
                onMutation?.();
              } catch (err) {
                console.error(err);
                alert("Failed to update task");
              }

              setEditRowIndex(null);
            }}
          >
            Save Changes
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
