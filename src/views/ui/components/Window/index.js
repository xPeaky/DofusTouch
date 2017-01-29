require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var Button = require('Button');
var CloseButton = require('CloseButton');
var windowsManager = require('windowsManager');
var playUiSound = require('audioManager').playUiSound;


function closeBtnHandler() {
	windowsManager.close(this.myWindow.id);
}

function onOpen() {
	window.clearTimeout(this.freeContentTimeout);

	if (this.openingSound) { playUiSound(this.openingSound || 'WINDOW_OPEN'); }

	this.isReadyForUserInteraction = true;
}

function onOpened() {
	// Unless startWaitingForContent() is called by derived class, our content is ready
	if (this.isReadyForUserInteraction) {
		this.emit('contentReady');
	}
	//...otherwise, this event will be sent by finishedWaitingForContent(), see below
}

function onClose() {
	if (typeof this.freeContentDelay === 'number' || typeof this.freeContent === 'function') {
		if (typeof this.freeContent !== 'function') { return console.error('missing freeContent method for', this.id); }
		// NB: we always call freeContent in separate tick (even if requested delay is 0) to give a chance to
		// a listener on 'close' event in the derived window. Anyway, people setting 0 delay should NOT have to
		// listen to 'close' event because they can clear all inside freeContent().
		this.freeContentTimeout = window.setTimeout(this.freeContent.bind(this), this.freeContentDelay || 0);
	}

	if (this.closingSound) { playUiSound(this.closingSound || 'WINDOW_CLOSE'); }
}


function Window(options) {
	options = options || {};
	WuiDom.call(this, 'div', { className: 'window', hidden: true });
	this.addClassNames(options.className);

	this.positionInfo = options.positionInfo;
	this.freeContentDelay = options.freeContentDelay;
	this.freeContentTimeout = null;

	// windowsManager is initialising/using this variable with a map containing: `x`, `y`, `width` and `height`
	// TODO: to be compiler friendly and for readability it should be initialised here
	this.position = null;

	// controlled by windowsManager
	this.openState = false;

	this.isReadyForUserInteraction = false;

	this.createChild('div', { className: 'windowBorder' });
	this.windowContent = this.createChild('div', { className: 'windowContent' });

	this.header = this.windowHeadWrapper = this.windowContent.createChild('div', { className: 'windowHeadWrapper' });

	if (options.plusButton) {
		this.plusButton = this.windowHeadWrapper.appendChild(new Button({ className: 'plusButton', scaleOnPress: true }));
		this.plusButton.myWindow = this;
	}

	if (options.minusButton) {
		this.minusButton = this.windowHeadWrapper.appendChild(new Button({ className: 'minusButton', scaleOnPress: true }));
		this.minusButton.myWindow = this;
	}

	if (!options.noTitle) {
		this.windowTitle = this.windowHeadWrapper.createChild('div', { className: 'windowTitle' });
		this.windowTitle.setText(options.title || '');
	}

	if (!options.noCloseButton) {
		this.closeButton = this.windowHeadWrapper.appendChild(new CloseButton({ scaleOnPress: true }));
		this.closeButton.myWindow = this;
		if (!options.customClose) {
			this.closeButton.on('tap', closeBtnHandler);
		}
	}

	this.openingSound = options.openingSound;
	this.closingSound = options.closingSound;

	this.windowBodyWrapper = this.windowContent.createChild('div', { className: 'windowBodyWrapper' });
	this.windowBody = this.windowBodyWrapper.createChild('div', { className: 'windowBody' });

	this.on('open', onOpen);
	this.on('opened', onOpened);
	this.on('close', onClose);
}

inherits(Window, WuiDom);
module.exports = Window;


/**
 * For auto tests.
 * Call this method during derived class on('open') if user interaction cannot start before content is ready.
 */
Window.prototype.startWaitingForContent = function () {
	this.isReadyForUserInteraction = false;
};

/**
 * For auto tests.
 * Call this method from derived class when window is ready for user interaction.
 */
Window.prototype.finishedWaitingForContent = function () {
	this.isReadyForUserInteraction = true;
	this.emit('contentReady');
};

/**
 * Change the title of the window
 * @param {String} newTitle
 */
Window.prototype.setTitle = function (newTitle) {
	this.windowTitle.setText(newTitle);
};

Window.prototype.localizeEvent = function (callback) {
	var self = this;

	return function () {
		if (self.openState) {
			callback.apply(this, arguments);  // "this" will be some emitter
		}
	};
};

Window.prototype.close = function (params) {
	windowsManager.close(this.id, params);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Window/index.js
 ** module id = 401
 ** module chunks = 0
 **/