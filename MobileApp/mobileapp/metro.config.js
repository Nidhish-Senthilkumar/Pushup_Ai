const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Allow Metro to bundle .html files
config.resolver.assetExts.push("html");

module.exports = config;