import { useEffect } from 'react';

/**
 * Preloads the Largest Contentful Paint (LCP) image dynamically by appending
 * a <link rel="preload" fetchpriority="high"> tag into the document head.
 * 
 * @param imageUrl The absolute URL of the high-priority LCP image (e.g. hero backdrop)
 */
export const usePreloadLCP = (imageUrl?: string) => {
  useEffect(() => {
    if (!imageUrl || typeof document === 'undefined') return;

    // Check if the preload link already exists
    let link = document.querySelector<HTMLLinkElement>(`link[rel="preload"][href="${imageUrl}"]`);

    if (!link) {
      link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = imageUrl;
      link.setAttribute('fetchpriority', 'high');
      document.head.appendChild(link);
    }

    return () => {
      // Cleanup preload tag on component unmount
      if (link && link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, [imageUrl]);
};

export default usePreloadLCP;
