"use client";

import { X, Plus, Users } from "lucide-react";

interface User {
  id: string;
  name: string;
  address: string;
}

interface MatesSectionProps {
  users: User[];
  onRemoveUser: (userId: string) => void;
  onSelectFromList: () => void;
  onAddManualMate: () => void;
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

export function MatesSection({
  users,
  onRemoveUser,
  onSelectFromList,
  onAddManualMate,
}: MatesSectionProps) {
  return (
    <section className="mb-6">
      <div className="bg-white border-[3px] border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        {/* Section Header */}
        <h2 className="text-xl font-bold text-black font-sans mb-6">
          Your Mates
        </h2>

        {/* Mates Display */}
        {users.length === 0 ? (
          <div className="text-center py-8 mb-6">
            <p className="text-black/60 font-mono text-sm mb-1">
              No mates added yet
            </p>
            <p className="text-xs text-black/40 font-mono">
              Choose from existing mates or add a mate manually to get started
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mb-6">
            {users.map((user, index) => (
              <div
                key={user.id}
                className="group flex items-center gap-2 px-3 py-2 rounded-full bg-[#f5f5f5] border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
              >
                <div
                  className={`w-7 h-7 ${AVATAR_COLORS[index % AVATAR_COLORS.length]} rounded-full border-2 border-black flex items-center justify-center font-bold text-xs text-black`}
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
                <button
                  onClick={() => onRemoveUser(user.id)}
                  className="w-5 h-5 rounded-full bg-black/10 hover:bg-[#ff1493] hover:text-white flex items-center justify-center transition-colors ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons - Secondary button style */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onSelectFromList}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-full border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-mono text-sm text-black font-medium"
          >
            <Users className="w-4 h-4" />
            From Friends
          </button>
          <button
            onClick={onAddManualMate}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-full border-[3px] border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all font-mono text-sm text-black font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Manually
          </button>
        </div>
      </div>
    </section>
  );
}
