/**
 * Downloads the Apple Configuration Profile (.mobileconfig) for the web application.
 * This configures the Apple WebClip profile on iOS, iPadOS, and macOS devices,
 * creating a full-screen, standalone application on the iPhone Home Screen with the official FLKRD logo.
 */

export const downloadMobileConfig = () => {
  try {
    // Prefer the dynamic serverless endpoint with origin detection & Aspen MIME header
    const endpoint = '/api/mobileconfig';
    
    // Create an invisible anchor to initiate native iOS profile download
    const link = document.createElement('a');
    link.href = endpoint;
    link.download = 'FLKRD_MOVIES.mobileconfig';
    link.setAttribute('rel', 'noopener noreferrer');
    document.body.appendChild(link);
    link.click();
    
    // Clean up DOM node
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    }, 150);
  } catch (err) {
    console.warn('[Apple Profile] Direct link fallback triggered:', err);
    window.location.href = '/api/mobileconfig';
  }
};