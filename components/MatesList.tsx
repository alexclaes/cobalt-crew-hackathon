'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { TripUser } from '@/types/trip';

interface MatesListProps {
  users: TripUser[];
}

const AVATAR_COLORS = [
  "bg-[#ff69b4]",
  "bg-[#7DF9FF]",
  "bg-[#E0B0FF]",
  "bg-[#c8ff00]",
  "bg-[#ffe135]",
  "bg-[#ff1493]",
  "bg-[#ffb347]",
];

export default function MatesList({ users }: MatesListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <h2 className="text-xl font-bold text-black font-sans">Trip Mates</h2>
        <ChevronRight
          className={`w-5 h-5 text-black transition-transform duration-200 ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />
      </button>

      {isExpanded && (
        <>
          {users.length === 0 ? (
            <div className="text-center py-8 text-black/60 font-mono">
              <p>No mates found for this trip</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {users.map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#f5f5f5] border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div
                    className={`w-7 h-7 ${
                      AVATAR_COLORS[index % AVATAR_COLORS.length]
                    } rounded-full border-2 border-black flex items-center justify-center font-bold text-xs text-black`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-black text-sm font-mono">
                      {user.name}
                    </span>
                    {user.address && (
                      <span className="text-[10px] text-black/50 font-mono">
                        {user.address}
                      </span>
                    )}
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
