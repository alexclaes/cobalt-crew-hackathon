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
    </div>
  );
}
