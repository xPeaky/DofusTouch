require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var windowsManager = require('windowsManager');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var InputBox = require('InputBox');
var md5 = require('md5');
var dimensions = require('dimensionsHelper').dimensions;
var keyboard = require('keyboard');

var windowSize = {
	w: 380,
	h: 250
};

function DeleteCharacterConfirmWindow() {
	Window.call(this, {
		className:     'DeleteCharacterConfirmWindow',
		title:         getText('ui.popup.delete'),
		positionInfo:  {
			left:   'c',
			top:    'c',
			width:  windowSize.w,
			height: windowSize.h
		},
		noCloseButton: true
	});

	var MAX_CHARS = 50;

	var self = this;
	var content = this.windowBody;
	var secretAnswer = '';
	var inputBox;
	var secretQuestionDiv;
	var id;
	var name;

	this.once('open', function () {
		content.createChild('div', {
			text:      getText('ui.charSel.secretQuestion'),
			className: 'explications'
		});

		var attemptDelete = function () {
			window.gui.openConfirmPopup({
				title: getText('ui.popup.warning'),
				message: getText('ui.popup.warnBeforeDelete', name),
				cb: function (agreed) {
					if (agreed) {
						window.dofus.sendMessage('CharacterDeletionRequestMessage', {
							characterId: id,
							secretAnswerHash: md5(id + '~' + secretAnswer)
						});
					}
					windowsManager.close(self.id);
				}
			});
		};

		secretQuestionDiv = content.createChild('div', { className: 'secretQuestionDiv' });

		inputBox = content.appendChild(new InputBox({
			attr: {
				maxlength: MAX_CHARS,
				value:     ''
			},
			onEnter: function () {
				inputBox.blur();
				attemptDelete();
			}
		}));
		inputBox.addClassNames('inputSecretAnswer');
		inputBox.on('change', function (val) {
			secretAnswer = val;
		});

		var buttonContainer = content.createChild('div', { className: 'buttonContainer' });
		var buttonOk = buttonContainer.appendChild(new Button(getText('ui.common.ok')));
		buttonOk.on('tap', attemptDelete);

		var buttonCancel = buttonContainer.appendChild(new Button(getText('ui.common.cancel')));
		buttonCancel.on('tap', function () {
			windowsManager.close(self.id);
		});

		this.keyboardHeight = dimensions.screenHeight * 0.6;
	});

	this.on('open', function (params) {
		keyboard.disableScroll(true);
		params = params || {};
		id = params.id;
		name = params.name;

		if (!params.secretQuestion) {
			console.error('DeleteCharacterConfirmWindow: missing secretQuestion for characterId', id);
		}
		secretQuestionDiv.setText(params.secretQuestion);
	});

	this.on('opened', function () {
		inputBox.focus();
	});

	this.on('close', function () {
		inputBox.setValue('');
		secretAnswer = '';
		inputBox.blur();
		keyboard.disableScroll(false);
	});

	keyboard.on('show', function (keyboardHeight) {
		self.setPosition(keyboardHeight);
	});
}

inherits(DeleteCharacterConfirmWindow, Window);
module.exports = DeleteCharacterConfirmWindow;

DeleteCharacterConfirmWindow.prototype.setPosition = function (keyboardHeight) {
	var freeVerticalSpace = dimensions.screenHeight - keyboardHeight;
	var positionInfo = {
		left:   'c',
		top:    (freeVerticalSpace - windowSize.h) / 2,
		width:  windowSize.w,
		height: windowSize.h
	};
	windowsManager.positionWindow(this.id, positionInfo);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/DeleteCharacterConfirmWindow/index.js
 ** module id = 707
 ** module chunks = 0
 **/