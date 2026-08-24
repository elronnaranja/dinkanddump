const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Metro's newer package.json "exports"-aware resolution (on by default
// since around Expo SDK 52/53) picks the wrong conditional export for a
// handful of packages that were authored primarily for Node.js. The one
// that actually bites here is @supabase/realtime-js's dependency on `ws`:
// with package-exports resolution on, Metro resolves ws's Node entry point,
// which itself requires Node core modules (stream, net, tls, ...) that
// don't exist in React Native — "Unable to resolve module stream from
// .../ws/lib/stream.js". React Native already provides a native global
// WebSocket, so realtime-js never actually needs the `ws` package at
// runtime here; the problem is purely Metro resolving an entry point meant
// for Node. Falling back to the older main-field-based resolution (and
// preferring the "browser" condition on packages that do declare one)
// avoids the whole class of Node-only conditional exports.
config.resolver.unstable_enablePackageExports = false;
config.resolver.unstable_conditionNames = ["browser"];

module.exports = config;
