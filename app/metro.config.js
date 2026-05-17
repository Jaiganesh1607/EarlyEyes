const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
const { assetExts } = defaultConfig.resolver;

const config = {
	resolver: {
		unstable_enableSymlinks: false,
		// Appends .bin (and other model formats) to the default Metro asset extensions
		// so that require('../../assets/models/ggml-tiny.bin') builds properly!
		assetExts: [...assetExts, 'bin', 'tflite', 'task'],
	},
	watchFolders: [],
};

module.exports = mergeConfig(defaultConfig, config);
