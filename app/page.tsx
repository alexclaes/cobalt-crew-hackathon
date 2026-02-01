'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { FloatingStickers } from '@/components/FloatingStickers';
import { VoiceSection } from '@/components/VoiceSection';
import { MatesSection } from '@/components/MatesSection';
import { TripThemeSection } from '@/components/TripThemeSection';
import UserSelectionModal from '@/components/UserSelectionModal';
import AddManualMateModal from '@/components/AddManualMateModal';
import { type VoiceResult } from '@/components/VoiceInput';
import { useMateManagement } from '@/hooks/useMateManagement';
import { useTripThemes } from '@/hooks/useTripThemes';
import { useTripCreation } from '@/hooks/useTripCreation';
import { useVoiceProcessing } from '@/hooks/useVoiceProcessing';
import type { TransportMode } from '@/types/trip';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManualMateModalOpen, setIsManualMateModalOpen] = useState(false);
  const [transportMode, setTransportMode] = useState<TransportMode>('geographic');

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

  const { themes, selectedThemeId, setSelectedThemeId } = useTripThemes();

  const { createTrip, isCreating } = useTripCreation();

  const { processVoiceResult, triggerRecording } = useVoiceProcessing({
    users,
    themes,
    onUsersAdded: (newUsers) => {
      newUsers.forEach((user) => {
        addUsers([user]);
      });
    },
    onThemeSelected: setSelectedThemeId,
    onUserRemoved: removeUser,
  });

  const handleVoiceResult = async (result: VoiceResult) => {
    console.log('[Home Page] Voice result received:', result);
    if (result.type === 'bulk') {
      console.log('[Home Page] Processing bulk result');
      await processVoiceResult(result);
    } else {
      console.log('[Home Page] Ignoring non-bulk result, type:', result.type);
    }
  };

  const handleVoiceError = (error: string) => {
    console.error('[Voice] Error:', error);
  };

  const handleCreateTrip = () => {
    createTrip(users, selectedThemeId, transportMode);
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
    <main className="min-h-screen bg-[#ffb6c1] relative overflow-hidden">
      <FloatingStickers />

      <div className="relative z-10">
        <Header />
        <VoiceSection
          themes={themes.map((t) => t.name)}
          onVoiceResult={handleVoiceResult}
          onError={handleVoiceError}
          triggerRecording={triggerRecording}
        />

        <div className="max-w-2xl mx-auto px-4 sm:px-4 md:px-6 pb-32 sm:pb-48 md:pb-[400px] overflow-visible">
          <MatesSection
            users={users}
            onRemoveUser={removeUser}
            onSelectFromList={() => setIsModalOpen(true)}
            onAddManualMate={() => setIsManualMateModalOpen(true)}
          />
          
          {/* Transport Mode Selection */}
          <div className="mt-8 bg-white rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
            <h2 className="text-xl font-bold text-black font-sans mb-4">Meeting Point Calculation</h2>
            <p className="text-sm text-gray-600 mb-4">Choose how to calculate the ideal meeting point for your group</p>
            <div className="flex gap-4 flex-wrap">
              <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors bg-white">
                <input
                  type="radio"
                  name="transport"
                  checked={transportMode === 'geographic'}
                  onChange={() => setTransportMode('geographic')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="font-mono">📍 Geographic Center</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors bg-white">
                <input
                  type="radio"
                  name="transport"
                  checked={transportMode === 'car'}
                  onChange={() => setTransportMode('car')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="font-mono">🚗 By Car (travel time)</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-not-allowed px-4 py-2 rounded-lg border-2 border-gray-200 opacity-50 bg-gray-50">
                <input
                  type="radio"
                  name="transport"
                  checked={transportMode === 'train'}
                  disabled
                  readOnly
                  className="text-gray-400 focus:ring-0 cursor-not-allowed"
                />
                <span className="font-mono text-gray-500">🚆 By Train (coming soon)</span>
              </label>
            </div>
          </div>

          <TripThemeSection
            themes={themes}
            selectedThemeId={selectedThemeId}
            onThemeSelect={setSelectedThemeId}
            onCreateTrip={handleCreateTrip}
            canCreateTrip={canCalculate}
            isCreating={isCreating}
            validationMessage={getValidationMessage()}
          />
        </div>
      </div>

      {/* Keep existing modals */}
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
