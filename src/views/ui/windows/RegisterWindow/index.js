require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var InputBox = require('InputBox');
var getText = require('getText').getText;
var Button = require('Button');
var DofusButton = Button.DofusButton;
var haapi = require('haapi');
var CheckboxLabel = require('CheckboxLabel');
var userPref = require('UserPreferences');
var async = require('async');
var keyboard = require('keyboard');
var dimensions = require('dimensionsHelper').dimensions;
var helper = require('helper');

var MAX_SUGGESTION = 3;

function RegisterWindow() {
	var large = dimensions.screenHeight > 655;

	Window.call(this, {
		className: 'RegisterWindow',
		title: '',
		positionInfo: { left: 'c', top: 'c', width: 450, height: large ? 640 : 550, isFullScreen: true },
		noCloseButton: true
	});

	if (large) {
		this.addClassNames('large');
	}

	var self = this;
	var guestAccount;
	var confirmPasswordTimeout;
	var wrapper = this.windowBody;
	var noop = function () {};
	var callback = noop;

	function haapiCall(form, cb) {
		async.series([
			function createGuest(callback) {
				if (guestAccount) {
					return callback();
				}
				haapi.createGuest(function (err, guestData) {
					if (err) {
						return callback(err);
					}

					guestAccount = {
						login: guestData.login,
						password: guestData._headers.password
					};
					userPref.setValue('guestAccount', guestAccount, 1);
					callback();
				});
			},
			function validateGuest(callback) {
				form.guestLogin = guestAccount.login;
				form.guestPassword = guestAccount.password;
				haapi.validateGuest(form, callback);
			}
		], function (err) {
			cb(err, {
				login: form.login,
				password: form.password
			});
		});
	}

	// form wrapper
	var formWrapper = wrapper.createChild('div', { className: 'formWrapper' });

	// login (between 6 and 19 characters)
	var loginLabel = formWrapper.createChild('label', { className: 'label' });
	var loginInput = formWrapper.appendChild(new InputBox(
		{ className: ['inputText', 'whiteStyle'], attr: { type: 'text', maxlength: 19 } }
	));
	loginInput.on('validate', function () {
		pwdInput.focus();
	});

	// password (between 8 and 49 characters)
	var pwdLabel = formWrapper.createChild('label', { className: 'label' });
	var pwdInput = formWrapper.appendChild(new InputBox(
		{ className: ['inputText', 'whiteStyle'], attr: { type: 'password', maxlength: 49 } }
	));
	var pwdLabelConfirm = formWrapper.createChild('label', { className: 'label' });
	var pwdInputConfirm = formWrapper.appendChild(new InputBox(
		{ className: ['inputText', 'whiteStyle'], attr: { type: 'password', maxlength: 49 } }
	));

	// email (x@y.z)
	var emailLabel = formWrapper.createChild('label', { className: 'label' });
	var emailInput = formWrapper.appendChild(new InputBox(
		{ className: ['inputText', 'whiteStyle'], attr: { type: 'email' } }
	));

	// nickname (between 3 and 29 characters)
	var nicknameLabel = formWrapper.createChild('label', { className: 'label' });
	var nicknameInput = formWrapper.appendChild(new InputBox(
		{ className: ['inputText', 'whiteStyle'], attr: { type: 'text', maxlength: 29 } }
	));

	// TOU and GCS
	var touWrapper = formWrapper.createChild('div', { className: 'touWrapper' });
	var touBox = touWrapper.appendChild(new CheckboxLabel());
	touWrapper.createChild('span', { text: ' (' });
	var touLink = touWrapper.appendChild(new Button({ className: 'link' }));
	touWrapper.createChild('span', { text: ', ' });
	var gcsLink = touWrapper.appendChild(new Button({ className: 'link' }));
	touWrapper.createChild('span', { text: ')' });

	// to display eventual feedback to the user
	var info = wrapper.createChild('div', { className: 'info' });
	var suggests = wrapper.createChild('div', { className: 'suggestion' });
	var suggestLabel = suggests.createChild('label', { className: 'label' });

	for (var i = 0; i < MAX_SUGGESTION; i++) {
		suggests.createChild('span', { className: 'set' });
	}

	var buttonContainer = wrapper.createChild('div', { className: 'buttonContainer' });
	var buttonCancel = buttonContainer.appendChild(new DofusButton());
	buttonCancel.addClassNames('cancel');
	var buttonValid = buttonContainer.appendChild(new DofusButton());

	function checkForm() {
		if (!loginInput.getValue().length ||
			!pwdInput.getValue().length ||
			!pwdInputConfirm.getValue().length ||
			pwdInput.getValue() !== pwdInputConfirm.getValue() ||
			!(/.+@.+\..+/.test(emailInput.getValue())) ||
			!nicknameInput.getValue().length ||
			!touBox.isActivate()
		) {
			buttonValid.disable();
		} else {
			buttonValid.enable();
		}
	}

	function confirmPassword() {
		var isPwdEmpty = !pwdInput.getValue().length;
		var isPwdConfirmEmpty = !pwdInputConfirm.getValue().length;
		var isTheSame = pwdInput.getValue() === pwdInputConfirm.getValue();

		if (!isPwdEmpty && !isPwdConfirmEmpty && !isTheSame) {
			info.addClassNames('error');
			info.setText(getText('tablet.register.confirmpwdNotSame'));
		} else {
			info.delClassNames('error');
			info.setText('');
		}
	}

	loginInput.on('change', checkForm);
	pwdInput.on('change', checkForm);
	pwdInputConfirm.on('change', checkForm);
	emailInput.on('change', checkForm);
	nicknameInput.on('change', checkForm);
	touBox.on('change', checkForm);

	pwdInputConfirm.on('change', function () {
		window.clearTimeout(confirmPasswordTimeout);
		confirmPasswordTimeout = window.setTimeout(confirmPassword, 1000);
	});

	loginInput.on('validate', function () {
		pwdInput.focus();
	});

	pwdInput.on('validate', function () {
		pwdInputConfirm.focus();
	});

	pwdInputConfirm.on('validate', function () {
		emailInput.focus();
	});

	emailInput.on('validate', function () {
		nicknameInput.focus();
	});

	nicknameInput.on('validate', function () {
		buttonValid.tap();
	});

	function openLink() {
		helper.openUrlInAppBrowser(this.link);
	}
	touLink.on('tap', openLink);
	gcsLink.on('tap', openLink);

	function addSuggestion(suggestion) {
		if (!suggestion) { return; }
		var suggestBoxes = suggests.getChildren();
		for (var i = 0; i < MAX_SUGGESTION; i++) {
			suggestBoxes[i + 1].setText((i > 0 ? ', ' : '') + suggestion[i]);
		}
		suggests.addClassNames('visible');
	}

	buttonValid.on('tap', function () {
		buttonCancel.disable();
		buttonValid.disable();
		info.setText(getText('ui.common.waiting'));
		suggests.delClassNames('visible');
		info.delClassNames('error');

		var form = {
			login: loginInput.getValue(),
			password: pwdInput.getValue(),
			email: emailInput.getValue(),
			nickname: nicknameInput.getValue()
		};

		if (guestAccount) {
			form.guestLogin = guestAccount.login;
			form.guestPassword = guestAccount.password;
		}

		haapiCall(form, function (err, newPlayer) {
			buttonCancel.enable();
			buttonValid.enable();
			if (err) {
				if (err._statusCode >= 600) {
					info.addClassNames('error');
					info.setText(err.text);
					addSuggestion(err.suggests);
					return;
				}

				window.gui.openSimplePopup(getText('ui.secureMode.error.default'));
				return console.error('RegisterWindow haapiCall', err);
			}

			return self.close(newPlayer);
		});
	});

	buttonCancel.on('tap', function () {
		self.close();
	});

	this.on('open', function (params) {
		callback = params.onValidate;
		guestAccount = params.guestAccount;
		buttonValid.disable();
		buttonCancel.enable();
		loginLabel.setText(getText('tablet.login.username'));
		pwdLabel.setText(getText('ui.login.password'));
		emailLabel.setText(getText('tablet.register.email'));
		pwdLabelConfirm.setText(getText('tablet.register.confirmpwd'));
		nicknameLabel.setText(getText('tablet.login.pseudo'));
		touBox.setText(getText('tablet.legals.accept'));
		touLink.setText(getText('tablet.legals.tou'));
		touLink.link = getText('tablet.legals.link.tou');
		gcsLink.setText(getText('tablet.legals.gcs'));
		gcsLink.link = getText('tablet.legals.link.gcs');
		buttonCancel.setText(getText('ui.common.cancel'));
		buttonValid.setText(getText('ui.common.validation'));
		suggestLabel.setText(getText('tablet.register.suggestion'));
		// to be able to scroll the form vertically on iOS without having the keyboard hiding
		keyboard.setAutomaticHide(false);
		if (guestAccount) {
			self.setTitle(getText('tablet.oldGuest.register'));
		} else {
			self.setTitle(getText('ui.login.createAccount'));
		}
	});

	this.on('opened', function () {
		loginInput.focus();
	});

	this.on('close', function (params) {
		loginInput.setValue('');
		pwdInput.setValue('');
		emailInput.setValue('');
		pwdInputConfirm.setValue('');
		nicknameInput.setValue('');
		nicknameInput.enable();
		info.setText('');
		info.delClassNames('error');
		suggests.delClassNames('visible');
		keyboard.setAutomaticHide(true);
		guestAccount = null;
		window.clearTimeout(confirmPasswordTimeout);
		callback(params);
		callback = noop;
	});
}

inherits(RegisterWindow, Window);
module.exports = RegisterWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/RegisterWindow/index.js
 ** module id = 1003
 ** module chunks = 0
 **/