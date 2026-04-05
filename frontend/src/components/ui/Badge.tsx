import clsx from 'clsx';
import { PostStatus } from '../../types';

const statusColors: Record<PostStatus, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  POSTING: 'bg-yellow-100 text-yellow-700',
  POSTED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-400',
};

export default function Badge({ status }: { status: PostStatus }) {
  return (
    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', statusColors[status])}>
      {status}
    </span>
  );
}
