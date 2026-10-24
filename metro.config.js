// Learn more: https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// `eas update` writes a large generated bundle to ./dist. Watching it makes every reload crawl,
// so keep Metro out of it. Only the project-root dist is excluded, not packages' own dist folders.
const projectDist = path.join(__dirname, 'dist').replace(/[\\/]/g, '[\\\\/]');
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  new RegExp(`^${projectDist}[\\\\/].*`),
];

module.exports = config;
