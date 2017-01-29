require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var windowsManager = require('windowsManager');
var InputBox = require('InputBox');
var getText = require('getText').getText;
var Button = require('Button');
var NicknameErrorEnum = require('NicknameErrorEnum');
var CheckboxLabel = require('CheckboxLabel');
var helper = require('helper');

var ERRORS = {};
ERRORS[NicknameErrorEnum.ALREADY_USED] = 'ui.nickname.alreadyUsed';
ERRORS[NicknameErrorEnum.SAME_AS_LOGIN] = 'ui.nickname.equalsLogin';
ERRORS[NicknameErrorEnum.TOO_SIMILAR_TO_LOGIN] = 'ui.nickname.similarToLogin';
ERRORS[NicknameErrorEnum.INVALID_NICK] = 'ui.nickname.invalid';
ERRORS[NicknameErrorEnum.UNKNOWN_NICK_ERROR] = 'ui.nickname.unknown';


function NicknameWindow() {
	Window.call(this, {
		className: 'NicknameWindow',
		title: '',
		positionInfo: { left: 'c', top: 'c', width: 500, height: 355 },
		noCloseButton: true
	});

	var self = this;
	var wrapper = this.windowBody;
	var description = wrapper.createChild('div', { className: 'description' });

	var nicknameBox = wrapper.appendChild(new InputBox({ className: 'nickname', attr: { maxlength: 29 } }));

	// TOU and GCS
	var touBox = wrapper.appendChild(new CheckboxLabel());
	var touLink = wrapper.appendChild(new Button({ className: 'link' }));
	var gcsLink = wrapper.appendChild(new Button({ className: 'link' }));

	var info = wrapper.createChild('div', { className: 'info' });

	var buttonContainer = wrapper.createChild('div', { className: 'buttonContainer' });
	var buttonCancel = buttonContainer.appendChild(new Button.DofusButton());
	var buttonValid = buttonContainer.appendChild(new Button.DofusButton());

	function validateNickname() {
		var nickname = nicknameBox.getValue();
		buttonValid.disable();
		buttonCancel.disable();
		info.setText(getText('ui.common.waiting'));
		info.delClassNames('error');
		window.dofus.sendMessage('NicknameChoiceRequestMessage', { nickname: nickname });
	}

	function validateForm() {
		if (nicknameBox.getValue().length < 3 || !touBox.isActivate()) {
			buttonValid.disable();
		} else {
			buttonValid.enable();
		}
	}

	function openLink() {
		helper.openUrlInAppBrowser(this.link);
	}
	touLink.on('tap', openLink);
	gcsLink.on('tap', openLink);

	this.once('open', function () {
		nicknameBox.on('change', validateForm);
		touBox.on('change', validateForm);

		nicknameBox.on('validate', function () {
			buttonValid.tap();
		});

		buttonValid.on('tap', validateNickname);

		buttonCancel.on('tap', function () {
			window.dofus.disconnect();
			windowsManager.close(self.id);
		});

		window.gui.on('NicknameRefusedMessage', function (msg) {
			info.setText(getText(ERRORS[msg.reason]));
			info.addClassNames('error');
			buttonValid.enable();
			buttonCancel.enable();
		});

		window.gui.on('NicknameAcceptedMessage', function () {
			self.close();
		});
	});

	this.on('open', function () {
		self.setTitle(getText('ui.pseudoChoice.title'));
		description.setText(getText('ui.pseudoChoice.help'));
		buttonValid.disable();
		buttonCancel.enable();
		buttonCancel.setText(getText('ui.common.cancel'));
		buttonValid.setText(getText('ui.common.validation'));
		touBox.setText(getText('tablet.legals.accept'));
		touLink.setText(getText('tablet.legals.tou'));
		touLink.link = getText('tablet.legals.link.tou');
		gcsLink.setText(getText('tablet.legals.gcs'));
		gcsLink.link = getText('tablet.legals.link.gcs');
		nicknameBox.focus();
	});

	this.on('close', function () {
		info.setText('');
		info.delClassNames('error');
		nicknameBox.setValue('');
		nicknameBox.blur();
	});
}

inherits(NicknameWindow, Window);
module.exports = NicknameWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/NicknameWindow/index.js
 ** module id = 1000
 ** module chunks = 0
 **/