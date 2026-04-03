import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import { Notification } from '../types';

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const icons = {
  success: <CheckCircle className="h-7 w-7 text-green-500" />,
  error: <AlertCircle className="h-7 w-7 text-red-500" />,
  info: <Info className="h-7 w-7 text-blue-500" />,
};

const borderColors = {
  success: 'border-green-500',
  error: 'border-red-500',
  info: 'border-blue-500',
};

const progressBarColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
};

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onDismiss }) => {
  const { id, type, title, message, duration = 7000 } = notification;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -50, scale: 0.5 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`relative w-full bg-black/70 backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden pointer-events-auto border-l-4 ${borderColors[type]}`}
    >
        <div className="p-4 flex items-start space-x-4">
            <div className="flex-shrink-0 mt-0.5">
                {icons[type]}
            </div>
            <div className="flex-1">
                <p className="font-bold text-white">{title}</p>
                <p className="text-sm text-gray-300">{message}</p>
            </div>
            <div className="flex-shrink-0">
                <button
                    onClick={() => onDismiss(id)}
                    className="text-gray-400 hover:text-white transition-colors"
                    aria-label="Dismiss notification"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
        <motion.div
            className={`absolute bottom-0 left-0 h-1 ${progressBarColors[type]}`}
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
        />
    </motion.div>
  );
};

export default NotificationItem;