import { useState, useEffect } from 'react';
import type { TripTheme } from '@/types/trip';

export function useTripThemes() {
  const [themes, setThemes] = useState<TripTheme[]>([]);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/trip-themes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.themes) && data.themes.length > 0) {
          setThemes(data.themes);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching themes:', err);
        setError('Failed to load themes');
        setIsLoading(false);
      });
  }, []);

  return {
    themes,
    selectedThemeId,
    setSelectedThemeId,
    isLoading,
    error,
  };
}
