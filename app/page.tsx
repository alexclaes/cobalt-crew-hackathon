'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddressInput, { AddressSuggestion } from '@/components/AddressInput';
import UserSelectionModal from '@/components/UserSelectionModal';
import { User } from '@/types/user';
import type { CreateTripRequest, CreateTripResponse } from '@/types/trip';

type UserEntry = User & {
  isPreConfigured: boolean;
  userLabel: string; // e.g., "User 1", "User 2"
};

export default function Home() {
  const router = useRouter();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [manualUserCount, setManualUserCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);

  const handleAddressSelect = (userId: string, address: AddressSuggestion) => {
    setUsers((prev) => {
      return prev.map((user) => {
        if (user.id === userId) {
          return {
            ...user,
            address: address.display_name,
            lat: address.lat,
            lon: address.lon,
          };
        }
        return user;
      });
    });
  };

  const handleRemoveUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    // If it's a manual user, decrement the counter
    const user = users.find(u => u.id === userId);
    if (user && !user.isPreConfigured) {
      setManualUserCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNameChange = (userId: string, name: string) => {
    setUsers((prev) => {
      return prev.map((user) => {
        if (user.id === userId) {
          return { ...user, name };
        }
        return user;
      });
    });
  };

  const handleAddManualUser = () => {
    const newCount = manualUserCount + 1;
    const newUser: UserEntry = {
      id: `manual-${Date.now()}`,
      name: '',
      address: '',
      lat: 0,
      lon: 0,
      isPreConfigured: false,
      userLabel: `User ${users.length + 1}`,
    };
    setUsers((prev) => [...prev, newUser]);
    setManualUserCount(newCount);
  };

  const handleSelectPreConfiguredUsers = (selectedUsers: User[]) => {
    const newUserEntries: UserEntry[] = selectedUsers.map((user, index) => ({
      ...user,
      isPreConfigured: true,
      userLabel: `User ${users.length + index + 1}`,
    }));
    setUsers((prev) => [...prev, ...newUserEntries]);
  };

  const handleCreateTrip = async () => {
    if (users.length < 2) {
      return;
    }

    setIsCreatingTrip(true);

    try {
      // Separate pre-configured and manual users
      const preConfiguredUserIds = users
        .filter((u) => u.isPreConfigured)
        .map((u) => u.id);

      const manualUsers = users
        .filter((u) => !u.isPreConfigured)
        .map((u) => ({
          name: u.name,
          address: u.address,
          lat: u.lat,
          lon: u.lon,
        }));

      // Create trip via API
      const requestBody: CreateTripRequest = {
        preConfiguredUserIds,
        manualUsers,
      };

      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to create trip');
      }

      const data: CreateTripResponse = await response.json();

      // Navigate to the trip page with the server-generated ID
      router.push(`/trip/${data.tripId}`);
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Failed to create trip. Please try again.');
      setIsCreatingTrip(false);
    }
  };

  const alreadySelectedUserIds = users
    .filter(u => u.isPreConfigured)
    .map(u => u.id);

  const canCalculate = users.length >= 2;

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Plan a Weekend Trip
          </h1>
          <p className="text-gray-600">
            Add addresses for each participant to find the perfect meeting point
          </p>
        </div>

        {/* Single Column: Address Inputs */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Add your Mates
              </h2>

              <div className="space-y-4">
                {/* Render address inputs for each user */}
                {users.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="mb-4">No mates added yet</p>
                    <p className="text-sm">
                      Choose from existing mates or add a mate manually to get started
                    </p>
                  </div>
                ) : (
                  users.map((user, index) => (
                    <AddressInput
                      key={user.id}
                      userLabel={user.userLabel}
                      userNumber={index + 1}
                      userName={user.name}
                      userAddress={user.address}
                      onAddressSelect={(address) =>
                        handleAddressSelect(user.id, address)
                      }
                      onNameChange={(name) => handleNameChange(user.id, name)}
                      onRemove={() => handleRemoveUser(user.id)}
                      isReadOnly={user.isPreConfigured}
                    />
                  ))
                )}

                {/* Add user buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex-1 py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    Choose from Existing Mates
                  </button>
                  <button
                    onClick={handleAddManualUser}
                    className="flex-1 py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    + Add Mate Manually
                  </button>
                </div>
              </div>

              {/* Create Trip Button */}
              <div className="mt-6">
                {canCalculate ? (
                  <button
                    onClick={handleCreateTrip}
                    disabled={isCreatingTrip}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isCreatingTrip ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Creating Trip...
                      </span>
                    ) : (
                      'Plan your Trip'
                    )}
                  </button>
                ) : (
                  <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
                    <div className="text-sm text-yellow-800">
                      Add at least two mates
                    </div>
                  </div>
                )}
              </div>
          </div>
        </div>
      </div>

      {/* User Selection Modal */}
      <UserSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectUsers={handleSelectPreConfiguredUsers}
        alreadySelectedUserIds={alreadySelectedUserIds}
      />
    </main>
  );
}
