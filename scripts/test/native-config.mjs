import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Run after mobile:prebuild. Check the actual generated inputs to both native
// builds; this does not claim APK/.app build success or runtime E2E coverage.
const root = fileURLToPath(new URL('../../apps/mobile/', import.meta.url));
const require = createRequire(path.join(root, 'package.json'));
const plist = require('@expo/plist').default;
const { IOSConfig, XML } = require('expo/config-plugins');
const read = (relative) => fs.readFile(path.join(root, relative), 'utf8');
const { expo } = JSON.parse(await read('app.json'));
const project = IOSConfig.XcodeUtils.getPbxproj(root);
const entries = Object.values(project.pbxXCBuildConfigurationSection())
  .filter((entry) => typeof entry === 'object' && entry.buildSettings?.INFOPLIST_FILE);
const policies = {};
for (const mode of ['Debug', 'Release']) {
  const entry = entries.find((item) => item.name === mode);
  assert.ok(entry, `Missing iOS ${mode} configuration`);
  assert.equal(entry.buildSettings.PRODUCT_BUNDLE_IDENTIFIER.replaceAll('"', ''), expo.ios.bundleIdentifier);
  const file = entry.buildSettings.INFOPLIST_FILE.replaceAll('"', '');
  const info = plist.parse(await read(`ios/${file}`));
  assert.equal(info.RCTNewArchEnabled, true, `Missing React Native architecture flag in ${mode}`);
  assert.deepEqual({ ...info.NSAppTransportSecurity }, { NSAllowsArbitraryLoads: mode === 'Debug' });
  const schemes = info.CFBundleURLTypes.flatMap((type) => type.CFBundleURLSchemes);
  assert.ok(schemes.includes(expo.scheme), `Missing app scheme in ${mode}`);
  assert.ok(schemes.includes(`exp+${expo.slug}`), `Missing dev-client scheme in ${mode}`);
  const scenes = info.UIApplicationSceneManifest?.UISceneConfigurations?.UIWindowSceneSessionRoleApplication;
  assert.ok(scenes?.length, `Missing iOS ${mode} scene configuration: iOS 27 cannot launch this build`);
  assert.ok(scenes.some((scene) => scene.UISceneDelegateClassName === 'EXExpoAppSceneDelegate'),
    `Missing Expo SDK 57 scene delegate in ${mode}`);
  policies[mode] = { file, info };
}
assert.notEqual(policies.Debug.file, policies.Release.file);
const appDelegate = await read(`ios/${path.dirname(policies.Release.file)}/AppDelegate.swift`);
assert.match(appDelegate, /class AppDelegate: [^{]*\bExpoReactNativeFactoryProvider\b/,
  'Scene delegate must be able to access the React Native factory');
assert.doesNotMatch(appDelegate, /factory\.startReactNative\s*\(/,
  'React Native startup belongs to the scene delegate, not AppDelegate');
assert.deepEqual(
  { ...policies.Debug.info, NSAppTransportSecurity: null },
  { ...policies.Release.info, NSAppTransportSecurity: null },
  'Debug plist lost app configuration',
);
for (const variant of ['main', 'debug']) {
  const xml = await XML.parseXMLAsync(await read(`android/app/src/${variant}/AndroidManifest.xml`));
  const attributes = xml.manifest.application[0].$;
  assert.equal(attributes['android:usesCleartextTraffic'], String(variant === 'debug'));
  if (variant === 'debug') assert.ok(attributes['tools:replace'].includes('android:usesCleartextTraffic'));
  assert.equal(attributes['android:networkSecurityConfig'], undefined, 'Review network security override');
}
const gradle = await read('android/app/build.gradle');
assert.ok(gradle.includes(`applicationId '${expo.android.package}'`) || gradle.includes(`applicationId "${expo.android.package}"`));
console.log('PASS: generated iOS scene lifecycle, Debug/Release ATS, IDs/schemes, plist parity; Android main/debug HTTP policy and app ID.');
