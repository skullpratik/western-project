import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

let idCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    setToasts(t => t.filter(x => x.id !== id));
    const tm = timers.current[id];
    if (tm) {
      clearTimeout(tm);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback((toast) => {
    const id = ++idCounter;
    const t = { id, type: 'info', title: 'Notice', message: '', timeout: 3200, ...toast };
    setToasts(prev => [...prev, t]);
    if (t.timeout !== 0) {
      timers.current[id] = setTimeout(() => remove(id), t.timeout);
    }
    return id;
  }, [remove]);

  const api = { push, remove };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="kt-toasts">
        {toasts.map(t => (
          <div key={t.id} className={`kt-toast ${t.type}`}>
            <div className="kt-toast-content">
              <div className="kt-toast-title">{t.title}</div>
              {t.message && <div className="kt-toast-msg">{t.message}</div>}
            </div>
            <button className="kt-toast-close" onClick={() => remove(t.id)} aria-label="Close">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToasts = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used inside <ToastProvider>');
  return ctx;
};
