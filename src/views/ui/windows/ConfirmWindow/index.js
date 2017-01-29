require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var windowsManager = require('windowsManager');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;

// enum
var actionsEnum = {
	NO: 0,
	YES: 1,
	IGNORE: 2
};

function ConfirmWindow(options) {
	options = options || {
		className: 'confirmWindow',
		positionInfo: { left: 'c', top: 'c', width: 600, height: 200, isModal: true },
		noCloseButton: true
	};

	Window.call(this, options);

	this._domCreated = false;
	this.actionsEnum = actionsEnum;

	var box = this._box = this.windowBody.createChild('div', { className: 'messageBox' });
	this.message = box.createChild('div', { className: 'message' });
}

inherits(ConfirmWindow, Window);
module.exports = ConfirmWindow;

module.exports.actionsEnum = actionsEnum;

ConfirmWindow.prototype.createDom = function () {
	var self = this;

	var buttonContainer = this.windowBody.createChild('div', { className: 'buttonContainer' });
	var buttonYes = buttonContainer.appendChild(new Button(getText('ui.common.yes')));
	buttonYes.on('tap', function () {
		if (typeof self.cb === 'function') {
			self.cb(actionsEnum.YES);
		}
		windowsManager.close(self.id, { keepDialog: self.keepDialog });
	});

	var buttonNo = buttonContainer.appendChild(new Button(getText('ui.common.no')));
	buttonNo.on('tap', function () {
		if (typeof self.cb === 'function') {
			self.cb(actionsEnum.NO);
		}
		windowsManager.close(self.id);
	});

	this._buttonIgnore = buttonContainer.appendChild(new Button(getText('ui.common.ignore')));
	this._buttonIgnore.on('tap', function () {
		if (typeof self.cb === 'function') {
			self.cb(actionsEnum.IGNORE);
		}
		windowsManager.close(self.id);
	});
	this._buttonIgnore.hide();

	this._domCreated = true;
};

ConfirmWindow.prototype.update = function (data, options) {
	if (!this._domCreated) {
		this.createDom();
	}
	options = options || {};
	// Display the first element of the list
	this.windowTitle.setText(data.title);
	this.message.setHtml(data.message);
	this.cb = data.cb;
	this.keepDialog = options.keepDialog;

	this._buttonIgnore.toggleDisplay(!!options.ignoreEnable);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/ConfirmWindow/index.js
 ** module id = 639
 ** module chunks = 0
 **/