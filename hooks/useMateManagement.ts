import { useState, useMemo } from 'react';
import { User, UserEntrySchema } from '@/types/user';

type UserEntry = User & {
  isPreConfigured: boolean;
  userLabel: string;
  isReadOnly: boolean;
};

export function useMateManagement() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [manualUserCount, setManualUserCount] = useState(0);

  const removeUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    const user = users.find((u) => u.id === userId);
    if (user && !user.isPreConfigured) {
      setManualUserCount((prev) => Math.max(0, prev - 1));
    }
  };

  const addManualMate = (mate: {
    name: string;
    address: string;
    lat: number;
    lon: number;
  }) => {
    const newCount = manualUserCount + 1;
    const newUser: UserEntry = {
      id: `manual-${Date.now()}`,
      name: mate.name,
      address: mate.address,
      lat: mate.lat,
      lon: mate.lon,
      isPreConfigured: false,
      userLabel: `User ${users.length + 1}`,
      isReadOnly: true,
    };
    setUsers((prev) => [...prev, newUser]);
    setManualUserCount(newCount);
  };

  const addUsers = (selectedUsers: User[]) => {
    const newUserEntries: UserEntry[] = selectedUsers.map((user, index) => ({
      ...user,
      isPreConfigured: true,
      userLabel: `User ${users.length + index + 1}`,
      isReadOnly: true,
    }));
    setUsers((prev) => [...prev, ...newUserEntries]);
  };

  const alreadySelectedUserIds = users
    .filter((u) => u.isPreConfigured)
    .map((u) => u.id);

  const completeUsers = useMemo(() => {
    return users.filter((user) => {
      const result = UserEntrySchema.safeParse(user);
      return result.success;
    });
  }, [users]);

  const canCalculate = completeUsers.length >= 2;

  return {
    users,
    removeUser,
    addManualMate,
    addUsers,
    alreadySelectedUserIds,
    completeUsers,
    canCalculate,
  };
}
