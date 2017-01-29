require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var protocolConstants = require('protocolConstants');
var windowsManager = require('windowsManager');
var InputBox = require('InputBox');

var MIN_RIDE_NAME_LEN = protocolConstants.MIN_RIDE_NAME_LEN;
var MAX_RIDE_NAME_LEN = protocolConstants.MAX_RIDE_NAME_LEN;

var X_OFFSET_INPUT = 153, Y_OFFSET_INPUT = 108; // px; offsets to position window on top of inputBox


function MountRenameWindow() {
	Window.call(this, {
		title: getText('ui.mount.renameTooltip'),
		className: 'MountRenameWindow',
		positionInfo: { left: 'c', top: 'c', width: '400px', height: '200px' }
	});

	var mainContainer = this.windowBody.createChild('div', { className: 'mainContainer' });
	mainContainer.createChild('div', { className: 'text', text: getText('ui.mount.popupRename') });

	var validateHandler = this._validate.bind(this);

	this._inputName = mainContainer.appendChild(new InputBox(
		{ className: 'inputName', attr: { type: 'text', maxlength: MAX_RIDE_NAME_LEN } },
		validateHandler));

	this._inputName.on('change', function (value) {
		// just a-zA-Z
		this.setValue(value.replace(/[^a-zA-Z]+/g, ''));
	});

	mainContainer.appendChild(new Button(getText('ui.common.ok'), { className: 'okBtn' }, validateHandler));

	this.on('open', function (params) {
		this._previousName = params.name;
		this._mountId = params.mountId;
		this._inputName.setValue(params.name);
		if (params.inputBox) { this._positionNextTo(params.inputBox); }
	});
	this.on('opened', function () {
		this._inputName.focus();
	});
}

inherits(MountRenameWindow, Window);
module.exports = MountRenameWindow;


MountRenameWindow.prototype._validate = function () {
	var newName = this._inputName.rootElement.value;
	this._inputName.rootElement.value = this._inputName.rootElement.value.replace(/[^a-zA-Z]+/g, '');
	if (newName && this._previousName !== newName &&
		newName.length >= MIN_RIDE_NAME_LEN &&
		newName.length <= MAX_RIDE_NAME_LEN) {
		window.dofus.sendMessage('MountRenameRequestMessage', { name: newName, mountId: this._mountId });
	}
	windowsManager.close(this.id);
};

MountRenameWindow.prototype._positionNextTo = function (element) {
	var targetRect = element.rootElement.getBoundingClientRect();
	this.position.x = targetRect.left - X_OFFSET_INPUT;
	this.position.y = targetRect.top - Y_OFFSET_INPUT;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/MountRenameWindow/index.js
 ** module id = 896
 ** module chunks = 0
 **/