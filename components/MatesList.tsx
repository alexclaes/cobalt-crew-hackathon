import type { TripUser } from '@/types/trip';

interface MatesListProps {
  users: TripUser[];
}

export default function MatesList({ users }: MatesListProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Trip Mates</h2>
      
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
                <div className="mb-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Name
                  </label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-700">
                    {user.name}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Address
                  </label>
                  <div className="px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-700 text-sm">
                    {user.address}
                  </div>
                </div>

                {/* Optional: Show if pre-configured */}
                {user.isPreConfigured && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Pre-configured mate</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
