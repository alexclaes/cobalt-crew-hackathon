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

        <div className="max-w-2xl mx-auto px-4 pb-16">
          <MatesSection
            users={users}
            onRemoveUser={removeUser}
            onSelectFromList={() => setIsModalOpen(true)}
            onAddManualMate={() => setIsManualMateModalOpen(true)}
          />
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
