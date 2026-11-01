// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite's web build loads wa-sqlite from a `.wasm` file, which Metro does
// not treat as an asset by default. Without this the web bundle cannot resolve.
config.resolver.assetExts.push('wasm');

// The web SQLite worker uses SharedArrayBuffer, which browsers only expose to
// cross-origin isolated pages. These headers make `expo start --web` isolated;
// a static host for `expo export --platform web` must send the same two headers.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = config;
