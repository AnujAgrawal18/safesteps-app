const { getDefaultConfig } = require('expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { resolver } = config;

  config.resolver = {
    ...resolver,
    sourceExts: process.env.EXPO_TARGET === 'web' 
      ? ['web.tsx', 'web.ts', 'web.jsx', 'web.js', 'tsx', 'ts', 'jsx', 'js']
      : ['native.tsx', 'tsx', 'ts', 'jsx', 'js'],
    platforms: ['ios', 'android', 'web'],
    blacklistRE: /.*\.native\.(js|jsx|ts|tsx)$/,
  };

  return config;
})();
