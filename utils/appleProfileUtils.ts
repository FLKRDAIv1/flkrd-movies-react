/**
 * Downloads the Apple Configuration Profile (.mobileconfig) for the web application.
 * This allows a "Native-like" install on iOS and macOS.
 */
export const downloadMobileConfig = () => {
  window.location.href = "/webclip.mobileconfig";
};