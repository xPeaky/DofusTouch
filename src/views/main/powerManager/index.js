/**
 * Use the PowerManagement plugin to forbid the tablet to go into sleep mode while we play.
 * NB: By default, the plugin will automatically release a wakelock when the app is paused
 * (e.g. when the screen is turned off, or the user switches to another app). It will reacquire
 * the wakelock upon app resume.
 *
 * See full plugin doc at https://github.com/Viras-/cordova-plugin-powermanagement
 */

var isActive = false;

exports.start = function () {
	if (!window.powerManagement) { return; } // plugin is not installed OR we are in browser

	if (isActive) { return console.warn('PowerManager already active'); }

	// Acquire a partial wakelock, allowing the screen to be dimmed
	// NB: if not supported (e.g. iOS), a full wakelock is requested.
	window.powerManagement.dim(function success() {
		isActive = true;
	}, function failure(error) {
		console.warn('PowerManager failed to acquire wakelock', error);
	});
};

exports.stop = function () {
	if (!window.powerManagement) { return; } // plugin is not installed OR we are in browser

	if (!isActive) { return console.warn('PowerManager was not active'); }

	// Release the wakelock
	window.powerManagement.release(function success() {
		isActive = false;
	}, function failure(error) {
		console.warn('PowerManager failed to release wakelock', error);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/powerManager/index.js
 ** module id = 156
 ** module chunks = 0
 **/