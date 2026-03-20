import React, { createContext, useContext, useState, useCallback } from 'react';

type SnackbarType = 'success' | 'error' | 'info' | 'warning' | 'loading';

interface SnackbarMessage {
  id: number;
  message: string;
  type: SnackbarType;
}

interface SnackbarContextType {
  showSnackbar: (message: string, type?: SnackbarType) => number;
  dismissSnackbar: (id: number) => void;
}

const SnackbarContext = createContext<SnackbarContextType>({
  showSnackbar: () => 0,
  dismissSnackbar: () => {},
});

export const useSnackbar = () => useContext(SnackbarContext);

let idCounter = 0;

export const SnackbarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snackbars, setSnackbars] = useState<SnackbarMessage[]>([]);

  const showSnackbar = useCallback((message: string, type: SnackbarType = 'info'): number => {
    const id = ++idCounter;
    setSnackbars(prev => [...prev, { id, message, type }]);
    if (type !== 'loading') {
      setTimeout(() => {
        setSnackbars(prev => prev.filter(s => s.id !== id));
      }, 3500);
    }
    return id;
  }, []);

  const dismissSnackbar = useCallback((id: number) => {
    setSnackbars(prev => prev.filter(s => s.id !== id));
  }, []);

  const remove = (id: number) => setSnackbars(prev => prev.filter(s => s.id !== id));

  const bgColor: Record<SnackbarType, string> = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-gray-800',
    warning: 'bg-yellow-500',
    loading: 'bg-blue-600',
  };

  const icon: Record<SnackbarType, string> = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
    loading: '↑',
  };

  return (
    <SnackbarContext.Provider value={{ showSnackbar, dismissSnackbar }}>
      {children}
      <div className="fixed top-4 left-4 z-[9999] flex flex-col gap-2 items-start pointer-events-none">
        {snackbars.map(s => (
          <div
            key={s.id}
            onClick={() => remove(s.id)}
            className={`pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm max-w-xs w-max cursor-pointer ${bgColor[s.type]}`}
            style={{ animation: 'slideInLeft 0.3s ease' }}
          >
            {s.type === 'loading' ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <span className="font-bold text-base leading-none">{icon[s.type]}</span>
            )}
            <span>{s.message}</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </SnackbarContext.Provider>
  );
};
