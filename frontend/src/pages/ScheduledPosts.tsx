import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchScheduledPosts, cancelPost } from '../api/client';
import { Post } from '../types';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

export default function ScheduledPosts() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ posts: Post[] }>({
    queryKey: ['scheduled'],
    queryFn: fetchScheduledPosts,
    refetchInterval: 30_000,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => cancelPost(id),
    onSuccess: () => {
      toast.success('Post cancelled');
      qc.invalidateQueries({ queryKey: ['scheduled'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: () => toast.error('Failed to cancel post'),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  const posts = data?.posts ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Scheduled Posts ({posts.length})</h1>
      {posts.length === 0 ? (
        <EmptyState message="No posts in the queue" />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge status={post.status} />
                  <span className="text-xs text-gray-400">
                    from @{post.sender?.username || post.sender?.instagramUserId}
                  </span>
                </div>
                <p className="text-sm text-gray-700 truncate">{post.caption || <em className="text-gray-400">No caption</em>}</p>
                {post.scheduledFor && (
                  <p className="text-xs text-blue-600 mt-1">
                    Scheduled: {format(new Date(post.scheduledFor), 'MMM d, yyyy h:mm a')}
                  </p>
                )}
              </div>
              <button
                onClick={() => cancel.mutate(post.id)}
                disabled={cancel.isPending}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
