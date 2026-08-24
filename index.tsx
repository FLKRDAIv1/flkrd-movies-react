import { initSecurityShield } from './utils/securityGuard';
// Initialize FLKRD Security Shield immediately at kernel entry
initSecurityShield();

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { UIProvider } from './contexts/UIContext';
import { GamepadProvider } from './contexts/GamepadContext';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';

// ── Google Translate Node Manipulation Crash Prevention ──
const nativeInsertBefore = Node.prototype.insertBefore;
Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
  if (referenceNode && referenceNode.parentNode !== this) {
    return newNode;
  }
  return nativeInsertBefore.call(this, newNode, referenceNode) as T;
};

const nativeRemoveChild = Node.prototype.removeChild;
Node.prototype.removeChild = function <T extends Node>(child: T): T {
  if (child.parentNode !== this) {
    return child;
  }
  return nativeRemoveChild.call(this, child) as T;
};

if (typeof document !== 'undefined') {
  const handleVis = () => {
    document.body.classList.toggle('tab-hidden', document.visibilityState === 'hidden');
  };
  document.addEventListener('visibilitychange', handleVis);
  handleVis();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister().catch(() => {});
    }
  }).catch(() => {});
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <UIProvider>
      <GamepadProvider>
        <LanguageProvider>
          <NotificationProvider>
            <AuthProvider>
              <PlayerProvider>
                <App />
              </PlayerProvider>
            </AuthProvider>
          </NotificationProvider>
        </LanguageProvider>
      </GamepadProvider>
    </UIProvider>
  </React.StrictMode>
);