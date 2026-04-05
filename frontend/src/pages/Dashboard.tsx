import { useQuery } from '@tanstack/react-query';
import { fetchStats } from '../api/client';
import StatCard from '../components/ui/StatCard';
import { Stats } from '../types';

export default function Dashboard() {
  const { data, isLoading } = useQuery<Stats>({ queryKey: ['stats'], queryFn: fetchStats });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total Received" value={data?.total ?? 0} />
        <StatCard label="Posted" value={data?.posted ?? 0} color="text-green-600" />
        <StatCard label="Scheduled" value={data?.scheduled ?? 0} color="text-blue-600" />
        <StatCard label="Failed" value={data?.failed ?? 0} color="text-red-600" />
        <StatCard label="Cancelled" value={data?.cancelled ?? 0} color="text-gray-400" />
        <StatCard label="Whitelisted Accounts" value={data?.whitelistCount ?? 0} color="text-purple-600" />
      </div>
    </div>
  );
}
