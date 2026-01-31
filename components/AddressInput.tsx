'use client';

import { useState, useEffect, useRef } from 'react';

export interface AddressSuggestion {
  display_name: string;
  lat: number;
  lon: number;
  place_id: number;
}

export interface AddressInputProps {
  userLabel: string;
  userNumber: number;
  userName: string;
  onAddressSelect: (address: AddressSuggestion) => void;
  onNameChange: (name: string) => void;
  onRemove?: () => void;
}

export default function AddressInput({
  userLabel,
  userNumber,
  userName,
  onAddressSelect,
  onNameChange,
  onRemove,
}: AddressInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }
        const data = await response.json();
        setSuggestions(data.results || []);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion);
    setQuery(suggestion.display_name);
    setShowSuggestions(false);
    onAddressSelect(suggestion);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedAddress(null);
    setSuggestions([]);
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-start gap-4">
        {/* Large User Number */}
        <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-2xl font-bold">
          {userNumber}
        </div>
        
        {/* Input Fields */}
        <div className="flex-1 space-y-3">
          {/* Name Input */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Enter name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Address Input */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Address
            </label>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="Enter address..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!!selectedAddress}
            />
            {selectedAddress && (
              <button
                onClick={handleClear}
                className="absolute right-2 top-8 text-gray-400 hover:text-gray-600"
                aria-label="Clear address"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
            {isLoading && (
              <div className="absolute right-2 top-8">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.place_id}
                    onClick={() => handleSelect(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
                  >
                    <div className="text-sm text-gray-900">{suggestion.display_name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
