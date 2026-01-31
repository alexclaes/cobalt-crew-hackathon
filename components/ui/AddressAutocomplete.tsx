import { forwardRef, useEffect, useRef } from 'react';
import { AddressSuggestion } from '@/hooks/useGeocoding';

interface AddressAutocompleteProps {
  query: string;
  suggestions: AddressSuggestion[];
  isLoading: boolean;
  showSuggestions: boolean;
  selectedAddress: AddressSuggestion | null;
  onQueryChange: (query: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  onClear: () => void;
  onFocus: () => void;
  label?: string;
  required?: boolean;
  placeholder?: string;
}

const AddressAutocomplete = forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  (
    {
      query,
      suggestions,
      isLoading,
      showSuggestions,
      selectedAddress,
      onQueryChange,
      onSelect,
      onClear,
      onFocus,
      label = 'Address',
      required = false,
      placeholder = 'Enter address...',
    },
    ref
  ) => {
    const suggestionsRef = useRef<HTMLDivElement>(null);

    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={onFocus}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={!!selectedAddress}
          />
          {selectedAddress && (
            <button
              onClick={onClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.place_id}
                onClick={() => onSelect(suggestion)}
                className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors"
              >
                <div className="text-sm text-gray-900">
                  {suggestion.display_name}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

AddressAutocomplete.displayName = 'AddressAutocomplete';

export default AddressAutocomplete;
