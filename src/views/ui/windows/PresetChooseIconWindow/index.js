var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var Window = require('Window');
var windowsManager = require('windowsManager');

// enum
var actionsEnum = require('ConfirmWindow').actionsEnum;

function PresetChooseIconWindow() {
	Window.call(this, {
		className: 'PresetChooseIconWindow',
		title: getText('ui.option.tabPic'),
		positionInfo: { left: 'c', top: 'c', width: 460, height: 250 }
	});

	// methods
	function saveAndClose() {
		windowsManager.close('presetChooseIcon', actionsEnum.YES);
	}

	this.once('open', function (setIconsBox) {
		// slots grid & save button
		this.windowBody.appendChild(setIconsBox);
		this.saveButton = this.windowBody.appendChild(new Button(getText('ui.common.save')));
		this.saveButton.on('tap', function () {
			saveAndClose();
		});
	});
}

inherits(PresetChooseIconWindow, Window);
module.exports = PresetChooseIconWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/PresetChooseIconWindow/index.js
 ** module id = 792
 ** module chunks = 0
 **/