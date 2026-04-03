
import React, { useState, useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { useTranslation } from '../contexts/LanguageContext';
import EnableNotificationsModal from './EnableNotificationsModal';

const PushNotificationBell: React.FC = () => {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { addNotification } = useNotification();
    const { t } = useTranslation();

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            addNotification({
                type: 'error',
                title: t('notificationsErrorTitle'),
                message: t('notificationsNotSupported'),
            });
            return;
        }

        if (permission === 'granted') {
            addNotification({
                type: 'info',
                title: t('notificationsInfoTitle'),
                message: t('notificationsAlreadyEnabled'),
            });
            return;
        }

        if (permission === 'denied') {
            setIsModalOpen(true);
            return;
        }

        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === 'granted') {
            addNotification({
                type: 'success',
                title: t('notificationsSuccessTitle'),
                message: t('notificationsEnabled'),
            });

            // Try to use SW registration for a more "native" feel
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    // Fix: Cast NotificationOptions to any to support extended properties like 'vibrate'
                    registration.showNotification(t('pushPermissionTitle'), {
                        body: t('pushPermissionBody'),
                        icon: '/flkrd-icon.png',
                        badge: '/flkrd-icon.png',
                        vibrate: [100, 50, 100],
                    } as any);
                });
            } else {
                new Notification(t('pushPermissionTitle'), {
                    body: t('pushPermissionBody'),
                    icon: '/flkrd-icon.png',
                });
            }
        } else {
            setIsModalOpen(true);
        }
    };

    const isGranted = permission === 'granted';

    return (
        <>
            <button
                onClick={requestPermission}
                className="relative text-gray-400 hover:text-white transition-colors"
                aria-label={t('enableNotifications')}
            >
                {isGranted ? <BellRing className="h-6 w-6 text-green-400" /> : <Bell className="h-6 w-6" />}
                {!isGranted && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-600 ring-2 ring-black"></span>
                )}
            </button>
            <EnableNotificationsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </>
    );
};

export default PushNotificationBell;
