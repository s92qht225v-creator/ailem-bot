import { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, Trash2, CheckCircle, XCircle, HelpCircle } from 'lucide-react';

const ConfirmContext = createContext();

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

const iconMap = {
  danger: <Trash2 className="w-6 h-6 text-red-500" />,
  warning: <AlertTriangle className="w-6 h-6 text-yellow-500" />,
  success: <CheckCircle className="w-6 h-6 text-green-500" />,
  error: <XCircle className="w-6 h-6 text-red-500" />,
  info: <HelpCircle className="w-6 h-6 text-accent" />
};

const buttonStyles = {
  danger: 'bg-red-600 hover:bg-red-700 text-white',
  warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  success: 'bg-green-600 hover:bg-green-700 text-white',
  info: 'bg-accent hover:bg-red-800 text-white',
  default: 'bg-primary hover:bg-red-700 text-white'
};

const ConfirmModal = ({ config, onConfirm, onCancel }) => {
  const {
    title = 'Tasdiqlash',
    message,
    confirmText = 'Tasdiqlash',
    cancelText = 'Bekor qilish',
    type = 'info',
    showCancel = true
  } = config;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 p-2 rounded-full bg-gray-100">
              {iconMap[type] || iconMap.info}
            </div>
            <div className="flex-1">
              <h3 id="confirm-title" className="text-lg font-semibold text-gray-900 mb-2">
                {title}
              </h3>
              <p className="text-gray-600 text-sm">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          {showCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${buttonStyles[type] || buttonStyles.default}`}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export const ConfirmProvider = ({ children }) => {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    config: {},
    resolve: null
  });

  const confirm = useCallback((config) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        config: typeof config === 'string' ? { message: config } : config,
        resolve
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    confirmState.resolve?.(true);
    setConfirmState({ isOpen: false, config: {}, resolve: null });
  }, [confirmState.resolve]);

  const handleCancel = useCallback(() => {
    confirmState.resolve?.(false);
    setConfirmState({ isOpen: false, config: {}, resolve: null });
  }, [confirmState.resolve]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {confirmState.isOpen && (
        <ConfirmModal
          config={confirmState.config}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export default ConfirmContext;
