const fs = require('node:fs/promises');
const path = require('node:path');
const {withInfoPlist,withAndroidManifest,withFinalizedMod} = require('expo/config-plugins');
// WebRTC's Expo plugin includes video permissions even for audio-only apps.
// Run this plugin after it. The existing image picker also disables its camera.
module.exports = function withCallAudioOnly(config) {
  config = withInfoPlist(config, mod => {
    delete mod.modResults.NSCameraUsageDescription;
    return mod;
  });
  config = withAndroidManifest(config, mod => {
    const permission = 'android.permission.CAMERA';
    mod.modResults.manifest['uses-permission'] = (mod.modResults.manifest['uses-permission'] || []).filter(entry => ![permission, 'android.permission.SYSTEM_ALERT_WINDOW'].includes(entry.$?.['android:name']));
    // Remove permissions contributed by native-library manifests as well.
    mod.modResults.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    mod.modResults.manifest['uses-permission'].push({$: {'android:name':permission,'tools:node':'remove'}});
    return mod;
  });
  // Expo's default manifest pass appends this permission after custom plugins.
  // Keep the development overlay only in src/debug and src/debugOptimized.
  return withFinalizedMod(config, ['android', async mod => {
    const file = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/AndroidManifest.xml');
    const xml = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, xml.replace(/^[ \t]*<uses-permission android:name="android\.permission\.SYSTEM_ALERT_WINDOW"[^>]*\/>\r?\n/gm, ''));
    return mod;
  }]);
};
