'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types/user';

interface UserSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUsers: (users: User[]) => void;
  alreadySelectedUserIds: string[];
}

export default function UserSelectionModal({
  isOpen,
  onClose,
  onSelectUsers,
  alreadySelectedUserIds,
}: UserSelectionModalProps) {
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

  const handleToggle = (userId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    const allIds = availableUsers
      .filter((user) => !alreadySelectedUserIds.includes(user.id))
      .map((user) => user.id);
    setSelectedIds(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleAddSelected = () => {
    const usersToAdd = availableUsers.filter((user) =>
      selectedIds.has(user.id)
    );
    onSelectUsers(usersToAdd);
    setSelectedIds(new Set());
    onClose();
  };

  const handleCancel = () => {
    setSelectedIds(new Set());
    onClose();
  };

  if (!isOpen) return null;

  const selectableUsers = availableUsers.filter(
    (user) => !alreadySelectedUserIds.includes(user.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Choose from Existing Users
          </h2>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : selectableUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              All users have been added already.
            </div>
          ) : (
            <>
              {/* Select All / Deselect All */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleDeselectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Deselect All
                </button>
              </div>

              {/* User List */}
              <div className="space-y-2">
                {selectableUsers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => handleToggle(user.id)}
                      className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {user.address}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddSelected}
            disabled={selectedIds.size === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Add Selected Users ({selectedIds.size})
          </button>
        </div>
      </div>
    </div>
  );
}
