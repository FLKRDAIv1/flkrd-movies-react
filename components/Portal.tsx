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
      portalRoot.style.pointerEvents = 'none';
      portalRoot.style.position = 'relative';
      portalRoot.style.zIndex = '99999';
      // Ensure the portal root is always at the top of the body flow for stacking
      document.body.appendChild(portalRoot);
    } else {
      portalRoot.style.pointerEvents = 'none';
    }

    return () => {
      // Keep root or clean if needed
    };
  }, [id]);

  if (!mounted) return null;

  const portalRoot = document.getElementById(id);
  if (!portalRoot) return null;

  return ReactDOM.createPortal(children, portalRoot);
};

export default Portal;
