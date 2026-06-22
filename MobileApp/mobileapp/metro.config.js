const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('bin');

// Stub out TF.js backends that don't exist in React Native
const stubPath = path.join(__dirname, 'tfjs-stub.js');
config.resolver.extraNodeModules = {
  '@tensorflow/tfjs-backend-webgpu': stubPath,
  '@tensorflow/tfjs-backend-webgl': stubPath,
};

module.exports = config;