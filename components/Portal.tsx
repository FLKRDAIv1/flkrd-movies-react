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
      portalRoot.style.position = 'fixed';
      portalRoot.style.inset = '0';
      portalRoot.style.zIndex = '999999';
      document.body.appendChild(portalRoot);
    }
  }, [id]);

  if (typeof document === 'undefined') return null;

  const portalRoot = document.getElementById(id);
  return ReactDOM.createPortal(children, portalRoot || document.body);
};

export default Portal;
