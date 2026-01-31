'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import AddressAutocomplete from './ui/AddressAutocomplete';
import { useGeocoding } from '@/hooks/useGeocoding';

interface AddManualMateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMate: (mate: {
    name: string;
    address: string;
    lat: number;
    lon: number;
  }) => void;
}

export default function AddManualMateModal({
  isOpen,
  onClose,
  onAddMate,
}: AddManualMateModalProps) {
  const [name, setName] = useState('');
  const {
    query,
    setQuery,
    suggestions,
    isLoading,
    selectedAddress,
    selectAddress,
    clearAddress,
    reset: resetGeocoding,
    showSuggestions,
    setShowSuggestions,
  } = useGeocoding();

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

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

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, setShowSuggestions]);

  const handleSubmit = () => {
    if (!name.trim() || !selectedAddress) {
      return;
    }

    onAddMate({
      name: name.trim(),
      address: selectedAddress.display_name,
      lat: selectedAddress.lat,
      lon: selectedAddress.lon,
    });

    // Reset form
    setName('');
    resetGeocoding();
    onClose();
  };

  const handleCancel = () => {
    // Reset form
    setName('');
    resetGeocoding();
    onClose();
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const isFormValid = name.trim().length > 0 && selectedAddress !== null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Add Mate Manually"
      footer={
        <>
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isFormValid}>
            Add Mate
          </Button>
        </>
      }
    >
      <div className="space-y-4 relative z-10 pb-64">
        {/* Name Input */}
        <Input
          label="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name..."
        />

        {/* Address Input */}
        <AddressAutocomplete
          ref={inputRef}
          label="Address"
          required
          query={query}
          suggestions={suggestions}
          isLoading={isLoading}
          showSuggestions={showSuggestions}
          selectedAddress={selectedAddress}
          onQueryChange={setQuery}
          onSelect={selectAddress}
          onClear={clearAddress}
          onFocus={handleFocus}
          placeholder="Enter address..."
        />
      </div>
    </Modal>
  );
}
