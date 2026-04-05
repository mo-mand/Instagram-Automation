import { useQuery } from '@tanstack/react-query';
import { fetchLogs } from '../api/client';
import { ActivityLog as ILog } from '../types';
import EmptyState from '../components/ui/EmptyState';
import { format } from 'date-fns';
import clsx from 'clsx';

const levelColors = {
  INFO: 'text-blue-600',
  WARN: 'text-yellow-600',
  ERROR: 'text-red-600',
};

export default function ActivityLog() {
  const { data, isLoading } = useQuery<{ logs: ILog[]; total: number }>({
    queryKey: ['logs'],
    queryFn: () => fetchLogs(),
    refetchInterval: 15_000,
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  const logs = data?.logs ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Activity Log</h1>
      {logs.length === 0 ? (
        <EmptyState message="No activity yet" />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Time</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Level</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Event</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {format(new Date(log.occurredAt), 'MMM d HH:mm:ss')}
                  </td>
                  <td className={clsx('px-4 py-3 font-medium', levelColors[log.level])}>
                    {log.level}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{log.event}</td>
                  <td className="px-4 py-3 text-gray-700">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
