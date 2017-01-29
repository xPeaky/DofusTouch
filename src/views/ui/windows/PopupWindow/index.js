require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var windowsManager = require('windowsManager');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var helper = require('helper');


function PopupWindow() {
	Window.call(this, {
		className: 'popupWindow',
		title: 'Popup',
		customClose: true,
		positionInfo: { left: 'c', bottom: 'c', width: 600, height: 210 }
	});

	this.messageStack = [];
}

inherits(PopupWindow, Window);
module.exports = PopupWindow;


PopupWindow.prototype._createContent = function () {
	var self = this;

	function next() {
		// Remove the message currently displayed
		self.messageStack.shift();
		// Close the PopupWindow if no message
		if (self.messageStack.length === 0) {
			windowsManager.close(self.id);
			return;
		}
		// Update the UI
		self._update();
	}

	var box = this.windowBody.createChild('div', { className: 'messageBox' });
	this.message = box.createChild('div', { className: 'message' });
	var buttonContainer = this.windowBody.createChild('div', { className: 'buttonContainer' });
	var buttonOk = buttonContainer.appendChild(new Button(getText('ui.common.ok')));
	buttonOk.on('tap', next);

	this.closeButton.on('tap', next);
};

/**
 * @method  _update
 *
 * @desc    Update the PopupWindow so that it removes the first message in the stack and displays the next one if any.
 *          If no message, close the popup.
 */
PopupWindow.prototype._update = function () {
	if (!this.message) {
		this._createContent();
	}

	// Display the first element of the list
	var currentMessage = this.messageStack[0];
	// Messages with 2 lines or 1 are centered (default is left-aligned)
	var align = currentMessage.message.split('<br>').length <= 2 ? 'center' : 'left';
	this.message.setStyle('text-align', align);

	this.message.setHtml(currentMessage.message);
	helper.allLinksOnTargetBlank(this.message);

	this.windowTitle.setText(currentMessage.title);
};

/** Add a new message to be displayed.
 * @param {Object} data         - The message to display
 * @param {String} data.title   - The message's title.
 * @param {String} data.message - The message's content.
 */
PopupWindow.prototype.addContent = function (data) {
	var stack = this.messageStack;
	if (stack.length && stack[stack.length - 1].message === data.message) {
		return; //we skip repeating messages (example: repeated server errors are annoying to "click away")
	}
	// Insert the message
	stack.push(data);
	// Update the PopupWindow
	if (stack.length === 1) {
		this._update();
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/PopupWindow/index.js
 ** module id = 1007
 ** module chunks = 0
 **/