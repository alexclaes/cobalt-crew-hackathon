interface ErrorMessageProps {
  message: string;
  className?: string;
}

export default function ErrorMessage({
  message,
  className = '',
}: ErrorMessageProps) {
  return (
    <div
      className={`p-4 bg-red-50 border border-red-200 rounded-md ${className}`}
    >
      <p className="text-sm text-red-800">{message}</p>
    </div>
  );
}
