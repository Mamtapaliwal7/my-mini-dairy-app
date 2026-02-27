// Learn more https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// ✅ Add .cjs support
config.resolver.sourceExts.push('cjs');

// ✅ Disable unstable package exports if needed
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
