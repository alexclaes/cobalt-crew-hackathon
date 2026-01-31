interface MateCardProps {
  userNumber: number;
  userName: string;
  userAddress: string;
  onRemove: () => void;
}

export default function MateCard({
  userNumber,
  userName,
  userAddress,
  onRemove,
}: MateCardProps) {
  return (
    <div className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
      {/* User Number Badge */}
      <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-lg flex items-center justify-center text-2xl font-bold">
        {userNumber}
      </div>

      {/* User Details */}
      <div className="flex-1 min-w-0">
        <div className="mb-2">
          <div className="text-lg font-semibold text-gray-900">
            {userName}
          </div>
        </div>

        <div>
          <div className="text-sm text-gray-600 leading-relaxed">
            {userAddress}
          </div>
        </div>
      </div>

      {/* Remove Button */}
      <button
        onClick={onRemove}
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
    </div>
  );
}
