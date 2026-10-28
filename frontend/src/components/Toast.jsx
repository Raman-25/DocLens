import { useState, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import '../styles/Toast.css';

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, variant = 'info') => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, variant }]);
      timers.current[id] = setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  return { toasts, toast, dismiss };
}

export function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant] ?? Info;
        return (
          <div
            key={t.id}
            className="toast"
            onClick={() => onDismiss(t.id)}
            role="alert"
          >
            <Icon size={16} className="toast__icon" />
            <span className="toast__msg">{t.message}</span>
          </div>
        );
      })}
    </div>
  );
}
