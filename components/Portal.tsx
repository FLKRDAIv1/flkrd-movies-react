import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

interface PortalProps {
  children: React.ReactNode;
  id?: string;
}

const Portal: React.FC<PortalProps> = ({ children, id = 'flkrd-portal-root' }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let portalRoot = document.getElementById(id);
    
    if (!portalRoot) {
      portalRoot = document.createElement('div');
      portalRoot.id = id;
      // Ensure the portal root is always at the top of the body flow for stacking
      document.body.appendChild(portalRoot);
    }

    return () => {
      // We don't necessarily want to remove the portal root on every unmount 
      // of a child, but we want to clean up if it's empty.
      // For now, let's keep it simple and just leave it there or clean it if we're the last.
    };
  }, [id]);

  if (!mounted) return null;

  const portalRoot = document.getElementById(id);
  if (!portalRoot) return null;

  return ReactDOM.createPortal(children, portalRoot);
};

export default Portal;
