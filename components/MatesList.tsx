'use client';

import { useState } from 'react';
import type { TripUser } from '@/types/trip';

interface MatesListProps {
  users: TripUser[];
}

export default function MatesList({ users }: MatesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <h2 className="text-xl font-semibold text-gray-800">Trip Mates</h2>
        <svg
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
      
      {isExpanded && (
        <>
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No mates found for this trip</p>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  {/* User Number Badge */}
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-2xl font-bold">
                    {index + 1}
                  </div>

                  {/* User Details */}
                  <div className="flex-1 min-w-0">
                    <div className="mb-3">
                      <div className="text-lg font-semibold text-gray-900">
                        {user.name}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-600 leading-relaxed">
                        {user.address}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
