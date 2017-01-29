require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;


function CancelWindow() {
	Window.call(this, {
		className: 'CancelWindow',
		positionInfo: { left: 'c', top: 'c', width: 600, height: 200 },
		noCloseButton: true
	});
	var self = this;
	this.message = this.windowBody.createChild('div', { className: 'message' });

	var buttonContainer = this.windowBody.createChild('div', { className: 'buttonContainer' });
	var buttonCancel = buttonContainer.appendChild(new Button(getText('ui.common.cancel')));
	buttonCancel.on('tap', function () {
		if (typeof self.cb === 'function') {
			self.cb();
		}
		self.close();
	});
}

inherits(CancelWindow, Window);
module.exports = CancelWindow;


CancelWindow.prototype.update = function (data, options) {
	options = options || {};
	this.windowTitle.setText(data.title);
	this.message.setHtml(data.message);
	this.cb = data.cb;
	this.keepDialog = options.keepDialog;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CancelWindow/index.js
 ** module id = 945
 ** module chunks = 0
 **/