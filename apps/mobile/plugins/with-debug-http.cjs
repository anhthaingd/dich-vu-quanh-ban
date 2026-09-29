const fs = require('node:fs/promises');
const path = require('node:path');
const plist = require('@expo/plist').default;
const { IOSConfig, withAndroidManifest, withFinalizedMod } = require('expo/config-plugins');

// Keep local HTTP in Debug only, including when Release is built from the
// same generated project. Do not gate this policy on a developer's shell env.
module.exports = function withDebugHttp(config) {
  config = withAndroidManifest(config, (mod) => {
    mod.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'false';
    // Expo's src/debug manifest overrides this to true for Metro/local API.
    return mod;
  });

  return withFinalizedMod(config, ['ios', async (mod) => {
    const root = mod.modRequest.projectRoot;
    const project = IOSConfig.XcodeUtils.getPbxproj(root);
    const configurations = Object.values(project.pbxXCBuildConfigurationSection())
      .filter((entry) => typeof entry === 'object' && entry.buildSettings?.INFOPLIST_FILE);
    const release = configurations.find((entry) => entry.name === 'Release');
    if (!release) throw new Error('Missing iOS Release Info.plist configuration');
    const releasePath = release.buildSettings.INFOPLIST_FILE.replaceAll('"', '');
    const debugPath = releasePath.replace(/Info\.plist$/, 'Info-Debug.plist');
    if (debugPath === releasePath) throw new Error('Unexpected iOS Info.plist path');
    const nativeRoot = mod.modRequest.platformProjectRoot;
    const info = plist.parse(await fs.readFile(path.join(nativeRoot, releasePath), 'utf8'));

    // ATS exceptions from the Expo template must not leak into Release.
    info.NSAppTransportSecurity = { NSAllowsArbitraryLoads: false };
    await fs.writeFile(path.join(nativeRoot, releasePath), plist.build(info));
    await fs.writeFile(path.join(nativeRoot, debugPath), plist.build({
      ...info,
      NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
    }));
    for (const entry of configurations) {
      entry.buildSettings.INFOPLIST_FILE = `"${entry.name === 'Debug' ? debugPath : releasePath}"`;
    }
    await fs.writeFile(IOSConfig.Paths.getPBXProjectPath(root), project.writeSync());
    return mod;
  }]);
};
