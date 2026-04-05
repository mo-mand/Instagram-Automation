import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchConfig, updateConfig } from '../api/client';
import { AppConfig } from '../types';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function Settings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ config: AppConfig }>({
    queryKey: ['config'],
    queryFn: fetchConfig,
  });

  const [pageId, setPageId] = useState('');
  const [maxPosts, setMaxPosts] = useState(3);
  const [tz, setTz] = useState('America/Toronto');

  useEffect(() => {
    if (data?.config) {
      setPageId(data.config.targetPageId);
      setMaxPosts(data.config.maxPostsPerDay);
      setTz(data.config.timezone);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => updateConfig({ targetPageId: pageId, maxPostsPerDay: maxPosts, timezone: tz }),
    onSuccess: () => {
      toast.success('Settings saved');
      qc.invalidateQueries({ queryKey: ['config'] });
    },
    onError: () => toast.error('Failed to save settings'),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-lg space-y-5">

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Instagram Account ID
          </label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            placeholder="17841412870282018"
          />
          <p className="text-xs text-gray-400 mt-1">The numeric IG Business Account ID to post to</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Posts Per Day
          </label>
          <input
            type="number"
            min={1}
            max={25}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={maxPosts}
            onChange={(e) => setMaxPosts(Number(e.target.value))}
          />
          <p className="text-xs text-gray-400 mt-1">
            Recommended: 3 posts/day. Posts beyond this limit roll over to the next day.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            placeholder="America/Toronto"
          />
          <p className="text-xs text-gray-400 mt-1">
            IANA timezone for peak-hour scheduling (e.g. America/Toronto, Europe/London)
          </p>
        </div>

        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <Save size={14} /> Save Settings
        </button>
      </div>
    </div>
  );
}
