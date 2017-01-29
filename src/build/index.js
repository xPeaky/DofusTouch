/* global _DEV_MODE_, _BUILD_UNIT_TEST_ */
require('./general.less');
require('./styles.less');
require('whatwg-fetch');
require('polyfill');

// Set by webpack
window.developmentMode = _DEV_MODE_;

/// Main
window.assetPreloader = require('assetPreloading');
window.dofus          = require('dofusProxy');

var dofusBody = document.createElement('div');
dofusBody.id = 'dofusBody';
document.body.appendChild(dofusBody);

/// Gui
var Foreground = require('Foreground');
var Gui = require('Gui');

window.gui = new Gui();
window.foreground = new Foreground();

// Fetching device info in order to add total memory capacity to it
var deviceInfo = require('deviceInfo');

/// Canvas
var WebGLRenderer = require('WebGLRenderer');

function initWizAssets(cb) {
	// if no wizAssets or a version of wizAssets without initialize method
	if (!window.wizAssets || !window.wizAssets.initialize) {
		return cb();
	}
	window.wizAssets.initialize(
		cb, // success callback
		function wizAssetsInitFailed() { // failure callback
			console.error('failed to init wizAssets');
			window.wizAssets = null;
			cb();
		}
	);
}

function launchGame() {
	if (WebGLRenderer.isWebGlSupported()) {
		var IsoEngine = require('IsoEngine');
		window.isoEngine = new IsoEngine();
		window.actorManager = window.isoEngine.actorManager;
		window.background = window.isoEngine.background;
	}

	// Set by webpack
	if (!_BUILD_UNIT_TEST_) {
		window.dofus.start();
	}
}

var chrome = window.chrome;
// To test memory limitation in browser browser:
// deviceInfo.isPhonegap = true;
// var chrome = {};
// chrome.system = {};
// chrome.system.memory = {};
// chrome.system.memory.getInfo = function (cb) {
// 	setTimeout(function () {
// 		cb({ capacity: 512 * 1024 * 1024 });
// 	}, 500);
// };

if ((typeof chrome === 'object') && chrome.system && chrome.system.memory && deviceInfo.isPhoneGap) {
	// We have access to device memory capacity
	chrome.system.memory.getInfo(function (memoryInfo) {
		deviceInfo.capacity = memoryInfo.capacity;
		initWizAssets(launchGame);
	});
} else {
	initWizAssets(launchGame);
}



/*****************
 ** WEBPACK FOOTER
 ** ./src/build/index.js
 ** module id = 0
 ** module chunks = 0
 **/