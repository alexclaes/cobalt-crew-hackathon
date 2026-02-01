import { useState, useEffect } from 'react';
import { User } from '@/types/user';

export function useUserSelection(isOpen: boolean) {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Load users from JSON file
      fetch('/data/users.json')
        .then((res) => res.json())
        .then((data) => {
          setAvailableUsers(data.users || []);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error('Error loading users:', error);
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = (userIds: string[]) => {
    setSelectedIds(new Set(userIds));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const reset = () => {
    setSelectedIds(new Set());
  };

  const getSelectedUsers = () => {
    return availableUsers.filter((user) => selectedIds.has(user.id));
  };

  return {
    availableUsers,
    selectedIds,
    isLoading,
    toggleUser,
    selectAll,
    deselectAll,
    reset,
    getSelectedUsers,
  };
}
