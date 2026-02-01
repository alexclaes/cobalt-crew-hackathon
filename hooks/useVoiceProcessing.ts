import { useState } from 'react';
import { User } from '@/types/user';
import type { BulkVoiceResult } from '@/components/VoiceInput';
import type { TripTheme } from '@/types/trip';

interface UserEntry extends User {
  isPreConfigured: boolean;
  userLabel: string;
  isReadOnly: boolean;
}

interface UseVoiceProcessingProps {
  users: UserEntry[];
  themes: TripTheme[];
  onUsersAdded: (newUsers: UserEntry[]) => void;
  onThemeSelected: (themeId: string) => void;
  onUserRemoved: (userId: string) => void;
}

export function useVoiceProcessing({
  users,
  themes,
  onUsersAdded,
  onThemeSelected,
  onUserRemoved,
}: UseVoiceProcessingProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [triggerRecording, setTriggerRecording] = useState(0);

  const processVoiceResult = async (result: BulkVoiceResult) => {
    if (result.type !== 'bulk') return;

    setIsProcessing(true);
    console.log('[Voice] Bulk result received:', result);

    try {
      // Load pre-configured users from the JSON file
      let preConfiguredUsers: User[] = [];
      try {
        const usersResponse = await fetch('/data/users.json');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          preConfiguredUsers = usersData.users || [];
        }
      } catch (error) {
        console.error('[Voice] Error loading pre-configured users:', error);
      }

      // Process each mate from voice input
      const newMates: UserEntry[] = [];
      const skippedMates: string[] = [];
      const notFoundMates: string[] = [];

      for (const mate of result.mates) {
        // Check if mate is already in the current users list
        const alreadyAdded = users.find(
          (u) => u.name.toLowerCase() === mate.name.toLowerCase()
        );

        if (alreadyAdded) {
          console.log(`[Voice] Mate "${mate.name}" is already added, skipping`);
          skippedMates.push(mate.name);
          continue;
        }

        // Check if mate exists in pre-configured users (by name, case-insensitive)
        const preConfiguredMate = preConfiguredUsers.find(
          (u) => u.name.toLowerCase() === mate.name.toLowerCase()
        );

        if (preConfiguredMate) {
          // Use the pre-configured mate
          console.log(`[Voice] Found pre-configured mate: ${preConfiguredMate.name}`);
          newMates.push({
            ...preConfiguredMate,
            isPreConfigured: true,
            userLabel: `User ${users.length + newMates.length + 1}`,
            isReadOnly: true,
          });
        } else {
          // Not found in pre-configured list
          // Check if address is just the name (meaning no location was provided)
          const hasLocation =
            mate.address.toLowerCase() !== mate.name.toLowerCase();

          if (!hasLocation) {
            // No location provided and not in pre-configured list
            console.warn(`[Voice] No location provided for: ${mate.name}`);
            notFoundMates.push(`${mate.name} (no location provided)`);
          } else {
            // Try to geocode the address
            try {
              const geocodeResponse = await fetch(
                `/api/geocode?q=${encodeURIComponent(mate.address)}`
              );
              if (geocodeResponse.ok) {
                const geocodeData = await geocodeResponse.json();
                if (geocodeData.results && geocodeData.results.length > 0) {
                  const firstResult = geocodeData.results[0];

                  // Generate unique ID for manual mate
                  const mateId = `manual-voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                  newMates.push({
                    id: mateId,
                    name: mate.name,
                    address: firstResult.display_name,
                    lat: firstResult.lat,
                    lon: firstResult.lon,
                    isPreConfigured: false,
                    userLabel: `User ${users.length + newMates.length + 1}`,
                    isReadOnly: true,
                  });

                  console.log(
                    `[Voice] Successfully added mate via geocoding: ${mate.name} at ${firstResult.display_name}`
                  );
                } else {
                  console.warn(`[Voice] No geocoding results for: ${mate.address}`);
                  notFoundMates.push(`${mate.name} (${mate.address})`);
                }
              } else {
                console.error(`[Voice] Geocoding failed for: ${mate.address}`);
                notFoundMates.push(`${mate.name} (${mate.address})`);
              }
            } catch (error) {
              console.error(`[Voice] Error processing mate ${mate.name}:`, error);
              notFoundMates.push(`${mate.name} (${mate.address})`);
            }
          }
        }
      }

      // Add all successfully processed mates
      if (newMates.length > 0) {
        onUsersAdded(newMates);
        console.log(`[Voice] Successfully added ${newMates.length} mate(s)`);
      }

      // Only show alert if there are errors (skipped or not found mates)
      const hasErrors = skippedMates.length > 0 || notFoundMates.length > 0;

      if (hasErrors) {
        let errorMessage = '';

        if (skippedMates.length > 0) {
          errorMessage += `⚠️ Already added (skipped): ${skippedMates.join(', ')}\n\n`;
        }

        if (notFoundMates.length > 0) {
          errorMessage += `❌ Could not find:\n${notFoundMates.map((name) => `• ${name}`).join('\n')}\n\n`;
          errorMessage += `After pressing OK, voice recording will start automatically.\nPlease provide the missing locations or add them manually later.`;
        }

        // Show alert and wait for user to dismiss
        alert(errorMessage);

        // After dismissing alert, trigger voice input again if there are mates that need location
        if (notFoundMates.length > 0) {
          // Small delay to ensure alert is fully dismissed
          setTimeout(() => {
            setTriggerRecording((prev) => prev + 1);
          }, 300);
        }
      }

      // Handle removals if provided
      if (result.removals && result.removals.length > 0) {
        console.log('[Voice] Processing removals:', result.removals);
        
        const removedNames: string[] = [];
        const notFoundForRemoval: string[] = [];
        
        for (const nameToRemove of result.removals) {
          const mateName = nameToRemove.toLowerCase().trim();
          
          // Find first matching mate (case-insensitive)
          const mateToRemove = users.find(
            (user) => user.name.toLowerCase() === mateName
          );
          
          if (mateToRemove) {
            onUserRemoved(mateToRemove.id);
            removedNames.push(mateToRemove.name);
            console.log(`[Voice] Removed: ${mateToRemove.name}`);
          } else {
            notFoundForRemoval.push(nameToRemove);
            console.warn(`[Voice] Mate not found for removal: ${nameToRemove}`);
          }
        }
        
        // Only show alert for errors
        if (notFoundForRemoval.length > 0) {
          alert(`⚠️ Could not find to remove: ${notFoundForRemoval.join(', ')}`);
        }
      }

      // Handle theme if provided
      if (result.theme && themes.length > 0) {
        // Find matching theme (case-insensitive)
        const matchingTheme = themes.find(
          (theme) => theme.name.toLowerCase() === result.theme!.toLowerCase()
        );

        if (matchingTheme) {
          onThemeSelected(matchingTheme.id);
          console.log(`[Voice] Selected theme: ${matchingTheme.name}`);
        } else {
          console.warn(`[Voice] Could not match theme: ${result.theme}`);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processVoiceResult,
    isProcessing,
    triggerRecording,
    setTriggerRecording,
  };
}
