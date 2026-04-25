import { TopCards } from "src/components/dashboards/modern/TopCards";
import { Footer } from "src/components/dashboards/modern/Footer";
import ProfileWelcome from "src/components/dashboards/modern/ProfileWelcome";

import { DataTable } from 'src/components/utilities/table/DataTable';
import { useState, useEffect } from 'react';

function getLocalTime(timezone: string): string {
    try {
        return new Date().toLocaleString('en-GB', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        });
    } catch {
        return 'Invalid TZ';
    }
}

function getWorkingStatus(timeStr: string): string {
    const [hours, minutes] = timeStr.split(':').map(Number);
    if (hours > 9 && hours < 17) return 'In-Office';
    if (hours === 9 && minutes >= 0) return 'In-Office';
    if (hours === 17 && minutes === 0) return 'In-Office';
    return 'Out-of-Office';
}

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function parseDateToISO(dateStr: string): string {
    const months: Record<string, string> = {
        january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
        july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    };
    const parts = dateStr.trim().split(/\s+/);
    const day = (parts[0] ?? '1').padStart(2, '0');
    const month = months[parts[1]?.toLowerCase()] ?? '01';
    const year = parts[2] ?? String(new Date().getFullYear());
    return `${year}-${month}-${day}`;
}

const calcPriority = (rows: Record<string, unknown>[]) =>
    rows.filter((r) => ['critical', 'high'].includes(String(r.priority).toLowerCase()) && String(r.status).toLowerCase() !== 'completed').length;
const calcNonPriority = (rows: Record<string, unknown>[]) =>
    rows.filter((r) => ['low', 'medium'].includes(String(r.priority).toLowerCase()) && String(r.status).toLowerCase() !== 'completed').length;

const Moderndash = () => {
    const [data, setData] = useState<any[]>([]);
    const [taskCount, setTaskCount] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [priorityCount, setPriorityCount] = useState(0);
    const [nonPriorityCount, setNonPriorityCount] = useState(0);

    useEffect(() => {
        fetch('http://localhost:3000/assignments')
            .then((res) => res.json())
            .then((resData) => {
                const transformed = resData.map((item: any) => {
                    const localTime = getLocalTime(item.timezone);
                    const workingStatus = getWorkingStatus(localTime);
                    return {
                        task_id: item.task_id,
                        user_id: item.user_id,
                        name: item.name,
                        'working hour status': workingStatus,
                        'local time': localTime,
                        task: item.task_name,
                        'due date': formatDate(item.due_date),
                        priority: item.priority,
                        status: item.status,
                    };
                });
                const rows = transformed as Record<string, unknown>[];
                setData(transformed);
                setTaskCount(transformed.length);
                setCompletedCount(rows.filter((r) => String(r.status).toLowerCase() === 'completed').length);
                setPendingCount(rows.filter((r) => String(r.status).toLowerCase() === 'pending').length);
                setPriorityCount(calcPriority(rows));
                setNonPriorityCount(calcNonPriority(rows));
            })
            .catch((err) => console.error(err));
    }, []);

    return (
        <>
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12">
                    <ProfileWelcome />
                </div>
                <div className="col-span-12">
                    <TopCards allTasksCount={taskCount} completedCount={completedCount} pendingCount={pendingCount} priorityCount={priorityCount} nonPriorityCount={nonPriorityCount} />
                </div>
                {/* <div className="lg:col-span-8 col-span-12 flex">
                    <RevenueUpdate />
                </div> */}
                {/* <div className="lg:col-span-4 col-span-12 ">
                    <YearlyBreakup />
                    <MonthlyEarning />
                </div> */}
                {/* <div className="lg:col-span-4 col-span-12">
                    <RecentTransaction />
                </div> */}
                <div className="col-span-12 flex">
                    {/* <ProductPerformance /> */}
                    <div className="flex gap-6 flex-col w-full min-w-0">
                    <DataTable
                        data={data}
                        hiddenColumns={['task_id', 'user_id']}
                        onDataChange={(d) => {
                            const rows = d as Record<string, unknown>[];
                            setTaskCount(d.length);
                            setCompletedCount(rows.filter((r) => String(r.status).toLowerCase() === 'completed').length);
                            setPendingCount(rows.filter((r) => String(r.status).toLowerCase() === 'pending').length);
                            setPriorityCount(calcPriority(rows));
                            setNonPriorityCount(calcNonPriority(rows));
                        }}
                        onRowSave={(row) => {
                            const r = row as Record<string, unknown>;
                            const payload = {
                                task_name: r.task,
                                due_date: parseDateToISO(String(r['due date'])),
                                priority: r.priority,
                                status: r.status,
                            };
                            console.log('onRowSave fired — task_id:', r.task_id, 'payload:', payload);
                            fetch(`http://localhost:3000/tasks/${r.task_id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(payload),
                            })
                                .then((res) => res.json())
                                .then((data) => console.log('Save response:', data))
                                .catch((err) => console.error('Failed to save task:', err));
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