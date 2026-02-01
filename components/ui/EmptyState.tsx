import { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-8 text-gray-500">
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <p className="mb-2 font-medium">{title}</p>
      {description && <p className="text-sm mb-4">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
