'use client';

import { User } from '@/types/user';
import Modal from './ui/Modal';
import Button from './ui/Button';
import LoadingSpinner from './ui/LoadingSpinner';
import UserList from './ui/UserList';
import { useUserSelection } from '@/hooks/useUserSelection';

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
  const {
    availableUsers,
    selectedIds,
    isLoading,
    toggleUser,
    selectAll,
    deselectAll,
    reset,
    getSelectedUsers,
  } = useUserSelection(isOpen);

  const handleAddSelected = () => {
    const usersToAdd = getSelectedUsers();
    onSelectUsers(usersToAdd);
    reset();
    onClose();
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  const selectableUsers = availableUsers.filter(
    (user) => !alreadySelectedUserIds.includes(user.id)
  );

  const handleSelectAll = () => {
    const allIds = selectableUsers.map((user) => user.id);
    selectAll(allIds);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Choose from Existing Mates"
      maxWidth="2xl"
      footer={
        <>
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleAddSelected} disabled={selectedIds.size === 0}>
            Add Selected Mates ({selectedIds.size})
          </Button>
        </>
      }
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          {/* Select All / Deselect All */}
          {selectableUsers.length > 0 && (
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-[#ff1493] hover:text-[#ff1493]/80 font-mono font-medium"
              >
                Select All
              </button>
              <span className="text-black/30 font-mono">|</span>
              <button
                onClick={deselectAll}
                className="text-sm text-[#ff1493] hover:text-[#ff1493]/80 font-mono font-medium"
              >
                Deselect All
              </button>
            </div>
          )}

          {/* User List */}
          <UserList
            users={availableUsers}
            selectedIds={selectedIds}
            onToggle={toggleUser}
            alreadySelectedUserIds={alreadySelectedUserIds}
          />
        </>
      )}
    </Modal>
  );
}
