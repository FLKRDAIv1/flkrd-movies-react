/**
 * Downloads the Apple Configuration Profile (.mobileconfig) for the web application.
 * This allows a "Native-like" install on iOS and macOS.
 */
export const downloadMobileConfig = () => {
  const link = document.createElement('a');
  link.href = "/fkurdmovie.mobileconfig";
  link.download = "FLKRD_MOVIES.mobileconfig";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};