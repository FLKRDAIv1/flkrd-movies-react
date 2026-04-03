/**
 * Generates an Apple Configuration Profile (.mobileconfig) for the web application.
 * This allows a "Native-like" install on iOS and macOS.
 */
export const downloadMobileConfig = () => {
  const identifier = "com.flkrdmovies.app";
  const uuid1 = "A1B2C3D4-E5F6-47H8-99J0-K1L2M3N4O5P6";
  const uuid2 = "B2C3D4E5-F6G7-48I9-A0K1-L2M3N4O5P6Q7";
  const appName = "FLKRD MOVIES";
  const url = window.location.origin + "/#/";
  
  // Note: For iOS Profiles, the WebClip usually inherits the touch-icon.
  // We specifyFullScreen and Precomposed for maximum OS integration.
  const profileXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>FullScreen</key>
			<true/>
			<key>IgnoreManifestScope</key>
			<false/>
			<key>IsRemovable</key>
			<true/>
			<key>Label</key>
			<string>${appName}</string>
			<key>PayloadDescription</key>
			<string>Configures ${appName} Web Clip for high-fidelity streaming.</string>
			<key>PayloadDisplayName</key>
			<string>${appName}</string>
			<key>PayloadIdentifier</key>
			<string>${identifier}.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>${uuid1}</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>Precomposed</key>
			<true/>
			<key>URL</key>
			<string>${url}</string>
		</dict>
	</array>
	<key>PayloadDisplayName</key>
	<string>${appName} Native Link</string>
	<key>PayloadIdentifier</key>
	<string>${identifier}</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>${uuid2}</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
    <key>PayloadDescription</key>
    <string>Official FLKRD MOVIES Native Interface configuration.</string>
    <key>PayloadOrganization</key>
    <string>FLKRD Digital</string>
</dict>
</plist>`;

  const blob = new Blob([profileXml], { type: 'application/x-apple-aspen-config' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = "FLKRD_Native_Link.mobileconfig";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};