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
  userAddress?: string;
  onAddressSelect: (address: AddressSuggestion) => void;
  onNameChange: (name: string) => void;
  onRemove?: () => void;
  isReadOnly?: boolean;
}

export default function AddressInput({
  userLabel,
  userNumber,
  userName,
  userAddress,
  onAddressSelect,
  onNameChange,
  onRemove,
  isReadOnly = false,
}: AddressInputProps) {
  const [query, setQuery] = useState(userAddress || '');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(
    userAddress ? { display_name: userAddress, lat: 0, lon: 0, place_id: 0 } : null
  );
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const prevUserAddressRef = useRef(userAddress);

  // Update query and selectedAddress when userAddress prop changes
  useEffect(() => {
    if (userAddress && userAddress !== prevUserAddressRef.current) {
      setQuery(userAddress);
      setSelectedAddress({ display_name: userAddress, lat: 0, lon: 0, place_id: 0 });
      prevUserAddressRef.current = userAddress;
    }
  }, [userAddress]);

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't search if an address is already selected
    if (selectedAddress) {
      return;
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
  }, [query, selectedAddress]);

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
  };

  const handleRemove = () => {
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
        <div className="flex-1 space-y-3 relative">
          {/* Name Input or Display */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Name
            </label>
            {isReadOnly ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>{userName}</span>
              </div>
            ) : (
              <input
                type="text"
                value={userName}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Enter name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>

          {/* Address Input or Display */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Address
            </label>
            {isReadOnly ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                <svg
                  className="w-4 h-4 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span className="text-sm">{userAddress || 'No address'}</span>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Remove Button */}
        {onRemove && (
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Remove mate"
            title="Remove mate"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
