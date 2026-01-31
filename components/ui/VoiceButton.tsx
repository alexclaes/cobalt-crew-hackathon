type VoiceState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

interface VoiceButtonProps {
  state: VoiceState;
  onClick: () => void;
  disabled?: boolean;
  buttonText?: string;
  buttonClassName?: string;
}

export default function VoiceButton({
  state,
  onClick,
  disabled = false,
  buttonText = 'Start Voice Input',
  buttonClassName = 'px-6 py-3 rounded-lg font-medium',
}: VoiceButtonProps) {
  const getButtonContent = () => {
    switch (state) {
      case 'listening':
        return (
          <>
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 bg-red-500 rounded-full animate-ping opacity-75"></div>
              <svg
                className="w-6 h-6 text-white relative z-10"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <rect x="6" y="6" width="8" height="8" rx="1" />
              </svg>
            </div>
            <span className="ml-3">Recording... Click to Stop</span>
          </>
        );

      case 'processing':
        return (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3">Processing...</span>
          </>
        );

      case 'success':
        return (
          <>
            <svg
              className="w-6 h-6 text-white"
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
            <span className="ml-3">Success!</span>
          </>
        );

      case 'error':
        return (
          <>
            <svg
              className="w-6 h-6 text-white"
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
            <span className="ml-3">Error</span>
          </>
        );

      default:
        return (
          <>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
            <span className="ml-3">{buttonText}</span>
          </>
        );
    }
  };

  const getButtonColor = () => {
    switch (state) {
      case 'listening':
        return 'bg-red-600 hover:bg-red-700';
      case 'processing':
        return 'bg-blue-600';
      case 'success':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const isButtonDisabled =
    disabled || state === 'processing' || state === 'success';

  return (
    <button
      onClick={onClick}
      disabled={isButtonDisabled}
      className={`
        ${buttonClassName}
        ${getButtonColor()}
        text-white
        flex items-center justify-center
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        shadow-lg hover:shadow-xl
        min-w-[200px]
      `}
    >
      {getButtonContent()}
    </button>
  );
}
