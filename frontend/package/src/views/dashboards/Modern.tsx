import { TopCards } from "src/components/dashboards/modern/TopCards";
import { Footer } from "src/components/dashboards/modern/Footer";
import ProfileWelcome from "src/components/dashboards/modern/ProfileWelcome";

import { DataTable } from 'src/components/utilities/table/DataTable';
import { useState, useEffect, useMemo, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL;

// Formats the current time in a given IANA timezone as HH:MM; falls back to 'Invalid TZ' on error.
function getLocalTime(timezone: string, now: Date): string {
    try {
        return now.toLocaleString('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    } catch {
        return 'Invalid TZ';
    }
}

// Returns 'In-Office' if the current hour in the given timezone is between 9 and 17 (exclusive).
function getWorkingStatus(timezone: string, now: Date): string {
    try {
        const hours = parseInt(
            new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hour12: false }).format(now),
            10,
        ) % 24;
        return hours >= 9 && hours < 17 ? 'In-Office' : 'Out-of-Office';
    } catch {
        return 'Out-of-Office';
    }
}

// Converts an ISO date string to a human-readable "day month year" format for display in the table.
function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

type Stats = {
    allTasksCount: number;
    completedCount: number;
    pendingCount: number;
    priorityCount: number;
    nonPriorityCount: number;
};

// Admin dashboard. Fetches all assignments on mount, auto-patches overdue tasks to "Pending",
// and recomputes local time / working status on every one-second tick.
const Moderndash = () => {
    const [rawData, setRawData] = useState<any[]>([]);
    const [now, setNow] = useState(() => new Date());
    const [stats, setStats] = useState<Stats>({
        allTasksCount: 0,
        completedCount: 0,
        pendingCount: 0,
        priorityCount: 0,
        nonPriorityCount: 0,
    });

    // Fetches global task statistics and updates the stat card state.
    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(`${API}/stats`);
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
    }, []);

    // Tick every second so local time updates in real-time
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        fetchStats();
        fetch(`${API}/assignments`)
            .then((res) => res.json())
            .then(async (resData) => {
                const nowCheck = new Date();
                const patches: Promise<any>[] = [];

                const enriched = resData.map((item: any) => {
                    const due = new Date(item.due_date);
                    const endOfDayGMT = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 1));
                    const overdue = nowCheck >= endOfDayGMT;
                    const statusLower = (item.status ?? '').toLowerCase();
                    if (overdue && statusLower !== 'completed' && statusLower !== 'pending') {
                        patches.push(
                            fetch(`${API}/tasks/${item.task_id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'Pending' }),
                            })
                        );
                        return { ...item, status: 'Pending' };
                    }
                    return item;
                });

                if (patches.length) {
                    await Promise.all(patches);
                    fetchStats();
                }

                setRawData(enriched);
            })
            .catch((err) => console.error(err));
    }, [fetchStats]);

    // Continuously check for tasks that become overdue while page is open
    useEffect(() => {
        if (!rawData.length) return;
        const overdueIds: number[] = [];
        const updated = rawData.map((item: any) => {
            const due = new Date(item.due_date);
            const endOfDayGMT = new Date(Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate() + 1));
            const statusLower = (item.status ?? '').toLowerCase();
            if (now >= endOfDayGMT && statusLower !== 'completed' && statusLower !== 'pending') {
                overdueIds.push(item.task_id);
                return { ...item, status: 'Pending' };
            }
            return item;
        });
        if (!overdueIds.length) return;
        setRawData(updated);
        Promise.all(
            overdueIds.map((id) =>
                fetch(`${API}/tasks/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'Pending' }),
                }).catch(console.error)
            )
        ).then(() => fetchStats());
    }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

    // Recompute local time / working status on every tick
    const data = useMemo(() =>
        rawData.map((item: any) => ({
            task_id: item.task_id,
            user_id: item.user_id,
            name: item.name,
            'working hour status': getWorkingStatus(item.timezone, now),
            'local time': getLocalTime(item.timezone, now),
            task: item.task_name,
            'due date': formatDate(item.due_date),
            priority: item.priority,
            status: item.status,
        })),
    [rawData, now]);

    return (
        <>
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
                        <DataTable
                            data={data}
                            hiddenColumns={['task_id', 'user_id']}
                            onMutation={(deletedTaskId, deletedUserId) => {
                                fetchStats();
                                // Remove only the exact row that was deleted so other
                                // assignees of the same task remain in rawData and in the table.
                                if (deletedTaskId !== undefined && deletedUserId !== undefined) {
                                    setRawData((prev: any[]) => prev.filter(
                                        (item: any) => !(item.task_id === deletedTaskId && item.user_id === deletedUserId)
                                    ));
                                }
                            }}
                        />
                    </div>
                </div>
                <div className="col-span-12">
                    <Footer />
                </div>
            </div>
        </>
    );
};

export default Moderndash;
