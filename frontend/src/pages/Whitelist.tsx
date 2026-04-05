import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWhitelist, addWhitelist, removeWhitelist } from '../api/client';
import { WhitelistedAccount } from '../types';
import EmptyState from '../components/ui/EmptyState';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';

export default function Whitelist() {
  const qc = useQueryClient();
  const [igId, setIgId] = useState('');
  const [username, setUsername] = useState('');

  const { data, isLoading } = useQuery<{ accounts: WhitelistedAccount[] }>({
    queryKey: ['whitelist'],
    queryFn: fetchWhitelist,
  });

  const add = useMutation({
    mutationFn: () => addWhitelist(igId.trim(), username.trim() || undefined),
    onSuccess: () => {
      toast.success('Account added to whitelist');
      setIgId('');
      setUsername('');
      qc.invalidateQueries({ queryKey: ['whitelist'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: () => toast.error('Failed to add account'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeWhitelist(id),
    onSuccess: () => {
      toast.success('Account removed');
      qc.invalidateQueries({ queryKey: ['whitelist'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: () => toast.error('Failed to remove account'),
  });

  const accounts = data?.accounts?.filter((a) => a.isActive) ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Whitelist</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
        <h2 className="font-medium mb-3">Add Authorized Account</h2>
        <div className="flex gap-2">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
            placeholder="Instagram User ID (numeric)"
            value={igId}
            onChange={(e) => setIgId(e.target.value)}
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40"
            placeholder="@username (optional)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <button
            onClick={() => add.mutate()}
            disabled={!igId.trim() || add.isPending}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Find the Instagram User ID in the Meta API setup page (the numeric ID like 17841412870282018)
        </p>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : accounts.length === 0 ? (
        <EmptyState message="No whitelisted accounts yet" />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Username</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Instagram ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">@{acc.username || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{acc.instagramUserId}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {format(new Date(acc.addedAt), 'MMM d, yyyy')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove.mutate(acc.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
