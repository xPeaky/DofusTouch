/**
 * @module keyboard
 * @desc This component is doing two things:
 *  - It's a wrapper around the cordova plugin Ionic Keyboard
 *    Platform supported: iOS, Android
 *    {@link https://github.com/driftyco/ionic-plugins-keyboard}
 *  - Is in charge of dismissing the keyboard, automatically or on request
 */

var deviceInfo = require('deviceInfo');
var EventEmitter = require('events.js');
var cordova = window.cordova;
var tapHelper = require('tapHelper');
var tapEvents = tapHelper.events;

var keyboard = new EventEmitter();
module.exports = keyboard;

var hideKeyboardAutomatically = true;

keyboard.show = function () {
	if (deviceInfo.isPhoneGap) {
		cordova.plugins.Keyboard.show();
	}
};

keyboard.hide = function () {
	if (document.activeElement.tagName === 'INPUT') {
		document.activeElement.blur();
	}
	if (deviceInfo.isPhoneGap) {
		cordova.plugins.Keyboard.close();
	}
};

keyboard.disableScroll = function (disable) {
	if (deviceInfo.isPhoneGap) {
		cordova.plugins.Keyboard.disableScroll(disable);
	}
};

keyboard.hideKeyboardAccessoryBar = function (hide) {
	if (deviceInfo.isPhoneGap) {
		cordova.plugins.Keyboard.hideKeyboardAccessoryBar(hide);
	}
};

keyboard.setAutomaticHide = function (active) {
	hideKeyboardAutomatically = !!active;
};

document.body.addEventListener(tapEvents.end,
	function (e) {
		if (document.activeElement.tagName === 'INPUT' && e.target.tagName !== 'INPUT' && hideKeyboardAutomatically) {
			keyboard.hide();
		}
	}, false
);

if (deviceInfo.isPhoneGap) {
	window.addEventListener('native.keyboardshow', function (e) {
		keyboard.emit('show', e.keyboardHeight);
	});

	// the goal of this block is:
	//  - to emit an event when the keyboard is hidden
	//  - to blur current inputbox (if any) if the user hit the software key "retract the keyboard"
	// but:
	//  * on iOS, when we hit the "enter" key to move the cursor to the next inputbox (via a listener on keypress)
	//    the 'native.keyboardhide' is emitted, even if becaused we focused directly on another inputbox inside
	//    the same tick, Safari's behaviour is to NOT retract the keyboard. To fix that, we are waiting a tick
	//    to check this particuliar case before proceeding.
	window.addEventListener('native.keyboardhide', function () {
		var initialInputBox = document.activeElement.tagName === 'INPUT' && document.activeElement;
		setTimeout(function () {
			var isInputBox = (document.activeElement.tagName === 'INPUT');
			if (isInputBox && initialInputBox !== document.activeElement) {
				return; // iOS fix: cursor moved from an inputBox to another: the keyboard did not retract
			}
			keyboard.emit('hide');
			if (initialInputBox) {
				document.activeElement.blur(); // if user used the "retract the keyboard" key
			}
		}, 0);
	});
}



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/keyboard/index.js
 ** module id = 300
 ** module chunks = 0
 **/