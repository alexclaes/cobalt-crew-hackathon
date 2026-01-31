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
      <div className="text-center py-8 text-black/60 font-mono">
        All mates have been added already.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectableUsers.map((user) => (
        <label
          key={user.id}
          className="flex items-start gap-3 p-3 border-[2px] border-black/20 rounded-lg hover:bg-[#ff69b4]/10 cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            checked={selectedIds.has(user.id)}
            onChange={() => onToggle(user.id)}
            className="mt-1 w-4 h-4 text-[#ff1493] border-black/30 rounded focus:ring-[#ff1493]"
          />
          <div className="flex-1">
            <div className="font-bold text-black font-mono">{user.name}</div>
            <div className="text-sm text-black/60 font-mono">{user.address}</div>
          </div>
        </label>
      ))}
    </div>
  );
}
