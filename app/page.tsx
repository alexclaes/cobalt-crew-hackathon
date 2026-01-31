'use client';

import { useState } from 'react';
import UserSelectionModal from '@/components/UserSelectionModal';
import AddManualMateModal from '@/components/AddManualMateModal';
import MateCard from '@/components/MateCard';
import VoiceInput, { type VoiceResult } from '@/components/VoiceInput';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import EmptyState from '@/components/ui/EmptyState';
import { useMateManagement } from '@/hooks/useMateManagement';
import { useTripThemes } from '@/hooks/useTripThemes';
import { useTripCreation } from '@/hooks/useTripCreation';
import { useVoiceProcessing } from '@/hooks/useVoiceProcessing';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualMateModalOpen, setIsManualMateModalOpen] = useState(false);

  // Custom hooks for business logic
  const {
    users,
    removeUser,
    addManualMate,
    addUsers,
    alreadySelectedUserIds,
    completeUsers,
    canCalculate,
  } = useMateManagement();

  const { themes, selectedThemeId, setSelectedThemeId, isLoading: themesLoading } =
    useTripThemes();

  const { createTrip, isCreating } = useTripCreation();

  const { processVoiceResult, triggerRecording, setTriggerRecording } =
    useVoiceProcessing({
      users,
      themes,
      onUsersAdded: (newUsers) => {
        newUsers.forEach((user) => {
          addUsers([user]);
        });
      },
      onThemeSelected: setSelectedThemeId,
    });

  const handleVoiceResult = async (result: VoiceResult) => {
    if (result.type === 'bulk') {
      await processVoiceResult(result);
    }
  };

  const handleVoiceError = (error: string) => {
    console.error('[Voice] Error:', error);
  };

  const handleCreateTrip = () => {
    createTrip(users, selectedThemeId);
  };

  const getValidationMessage = () => {
    if (!selectedThemeId) {
      return 'Please select a trip theme';
    }
    if (users.length === 0) {
      return 'Add at least two mates';
    }
    if (completeUsers.length === 0) {
      return 'Please complete the information for your mates (name and address)';
    }
    return `Add ${2 - completeUsers.length} more mate(s) with complete information`;
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">MidWay</h1>
          <p className="text-gray-600 mb-6">
            Automagically plan a trip with your mates
          </p>

          {/* Quick Start with Voice */}
          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
            <div className="flex flex-col items-center gap-3">
              <VoiceInput
                context="bulk"
                availableThemes={themes.map((t) => t.name)}
                onResult={handleVoiceResult}
                onError={handleVoiceError}
                buttonText="Quick Start with Voice"
                buttonClassName="px-8 py-4 rounded-xl font-semibold text-lg shadow-lg"
                triggerRecording={triggerRecording}
              />

              <div className="text-center">
                <p className="text-xs text-gray-500 italic mb-3">
                  Example: "Add Sarah, Michael from Munich, and Alex. I want a food
                  and drink trip."
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          <Card>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Mates</h2>

            <div className="space-y-4">
              {/* Mates List */}
              {users.length === 0 ? (
                <EmptyState
                  title="No mates added yet"
                  description="Choose from existing mates or add a mate manually to get started"
                />
              ) : (
                users.map((user, index) => (
                  <MateCard
                    key={user.id}
                    userNumber={index + 1}
                    userName={user.name}
                    userAddress={user.address}
                    onRemove={() => removeUser(user.id)}
                  />
                ))
              )}

              {/* Add User Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex-1 py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  Choose mates from friends list
                </button>
                <button
                  onClick={() => setIsManualMateModalOpen(true)}
                  className="flex-1 py-2 px-4 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  + Add Mate Manually
                </button>
              </div>
            </div>

            {/* Theme Selection */}
            <div className="mt-6">
              <Select
                label="Trip Theme"
                value={selectedThemeId || ''}
                onChange={(e) => setSelectedThemeId(e.target.value || null)}
                disabled={themesLoading || themes.length === 0}
                className="text-xl font-semibold"
              >
                {themesLoading ? (
                  <option value="">Loading themes...</option>
                ) : (
                  <>
                    <option value="">Select a theme...</option>
                    {themes.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.icon} {theme.name}
                      </option>
                    ))}
                  </>
                )}
              </Select>
            </div>

            {/* Create Trip Button */}
            <div className="mt-6">
              {canCalculate && selectedThemeId ? (
                <Button
                  onClick={handleCreateTrip}
                  isLoading={isCreating}
                  className="w-full py-3"
                  size="lg"
                >
                  {isCreating ? 'Creating Trip...' : 'Plan your Trip'}
                </Button>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
                  <div className="text-sm text-yellow-800">
                    {getValidationMessage()}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <UserSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectUsers={addUsers}
        alreadySelectedUserIds={alreadySelectedUserIds}
      />

      <AddManualMateModal
        isOpen={isManualMateModalOpen}
        onClose={() => setIsManualMateModalOpen(false)}
        onAddMate={addManualMate}
      />
    </main>
  );
}
