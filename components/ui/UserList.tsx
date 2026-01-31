import { User } from '@/types/user';

interface UserListProps {
  users: User[];
  selectedIds: Set<string>;
  onToggle: (userId: string) => void;
  alreadySelectedUserIds: string[];
}

export default function UserList({
  users,
  selectedIds,
  onToggle,
  alreadySelectedUserIds,
}: UserListProps) {
  const selectableUsers = users.filter(
    (user) => !alreadySelectedUserIds.includes(user.id)
  );

  if (selectableUsers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        All mates have been added already.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectableUsers.map((user) => (
        <label
          key={user.id}
          className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            checked={selectedIds.has(user.id)}
            onChange={() => onToggle(user.id)}
            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-600">{user.address}</div>
          </div>
        </label>
      ))}
    </div>
  );
}
