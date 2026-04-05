import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPostedPosts, deletePost, editCaption } from '../api/client';
import { Post } from '../types';
import EmptyState from '../components/ui/EmptyState';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Trash2, Pencil, X, Check } from 'lucide-react';

export default function PostedPosts() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const { data, isLoading } = useQuery<{ posts: Post[]; total: number }>({
    queryKey: ['posted'],
    queryFn: () => fetchPostedPosts(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: () => {
      toast.success('Post deleted');
      qc.invalidateQueries({ queryKey: ['posted'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: () => toast.error('Failed to delete post'),
  });

  const edit = useMutation({
    mutationFn: ({ id, caption }: { id: string; caption: string }) => editCaption(id, caption),
    onSuccess: () => {
      toast.success('Caption updated');
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ['posted'] });
    },
    onError: () => toast.error('Failed to update caption'),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  const posts = data?.posts ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Posted Posts ({data?.total ?? 0})</h1>
      {posts.length === 0 ? (
        <EmptyState message="No posts published yet" />
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">POSTED</span>
                    <span className="text-xs text-gray-400">
                      {post.postedAt && format(new Date(post.postedAt), 'MMM d, yyyy h:mm a')}
                    </span>
                    <span className="text-xs text-gray-400">
                      from @{post.sender?.username || post.sender?.instagramUserId}
                    </span>
                  </div>

                  {editingId === post.id ? (
                    <div className="flex gap-2">
                      <input
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                      />
                      <button
                        onClick={() => edit.mutate({ id: post.id, caption: editText })}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700">
                      {post.caption || <em className="text-gray-400">No caption</em>}
                    </p>
                  )}
                </div>

                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => { setEditingId(post.id); setEditText(post.caption || ''); }}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit caption"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this post from Instagram?')) remove.mutate(post.id); }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete post"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
