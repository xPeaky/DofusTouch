require('./GuestForm.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var Button = require('Button');
var getText = require('getText').getText;
var userPref = require('UserPreferences');
var haapi = require('haapi');
var ConnectionOptions = require('./ConnectionOptions/index.js');

function GuestForm(loginScreen) {
	WuiDom.call(this, 'div', { className: ['GuestForm', 'rightColumn'], hidden: true });
	this.loginScreen = loginScreen;
	var self = this;

	this.guestAccount = null;
	this.isAlreadyGuest = null;
	this.nickname = null;

	// main blocks
	this.createChild('div', { className: ['frame', 'frame1'] }); // background frame
	var content = this.createChild('div', { className: 'content' });
	content.createChild('div', { className: 'dofusTouchLogo' }); // logo
	var form = content.createChild('div', { className: 'form' });

	// intro text
	this._introText = form.createChild('div', { className: 'introText' });

	// play button
	this._btnPlay = form.createChild('div', { className: 'horizontalCenter' }).appendChild(new Button({
		className: ['button', 'buttonPlay'],
		sound: 'OK_BUTTON'
	}));
	this._btnPlay.on('tap', function () {
		if (!self.isAlreadyGuest) {
			return self._createGuest();
		}
		var lastIdentification = window.localStorage.getItem('lastIdentification');
		if (lastIdentification) {
			var timeSinceLastIdentification = Date.now() - lastIdentification;
			if (timeSinceLastIdentification > 24 * 60 * 60 * 1000) { // 24 hours
				window.gui.openConfirmPopup({
					title: getText('tablet.oldGuest.register'),
					message: getText('tablet.oldGuest.registerReminder'),
					cb: function (result) {
						if (result) {
							return loginScreen.openRegisterWindow(self.guestAccount);
						}
						self._play();
					}
				});
				self._updateLastIdentificationTime();
				return;
			}
		} else {
			self._updateLastIdentificationTime();
		}

		self._play();
	});

	// connection options
	this._connectionOptions = form.appendChild(new ConnectionOptions(loginScreen, this));

	// create an account
	this._createAccount = this.appendChild(new Button({ className: 'switchAccountBtn' }, function () {
		loginScreen.openRegisterWindow(self.guestAccount);
	}));

	// has an account
	this._hasAnAccount = this.appendChild(new Button({ className: 'switchAccountBtn2nd' }, function () {
		userPref.setValue('hasAccount', true, 1);
		loginScreen.showLoginForm();
	}));

	// green line
	this.createChild('div', { className: 'greenLine' });
}

inherits(GuestForm, WuiDom);
module.exports = GuestForm;

GuestForm.prototype.refresh = function () {
	this._btnPlay.setText(getText('ui.common.play'));
	this._hasAnAccount.setText(getText('tablet.login.haveLogin'));
	this._connectionOptions.refresh();

	this._update();
};

GuestForm.prototype._update = function () {
	this.guestAccount = userPref.getValue('guestAccount', null, true);
	this.isAlreadyGuest = !!(this.guestAccount && this.guestAccount.login && this.guestAccount.password);
	this.nickname = (this.guestAccount && this.guestAccount.nickname) || 'guestWithNoNickname';

	if (this.isAlreadyGuest) {
		this._createAccount.setText(getText('tablet.oldGuest.register'));
		if (this.nickname === 'guestWithNoNickname') {
			this._introText.setText(getText('tablet.oldGuest.desc.no.nick'));
		} else {
			this._introText.setText(getText('tablet.oldGuest.desc', this.nickname));
		}
	} else {
		this._createAccount.setText(getText('tablet.login.createAccount'));
		this._introText.setText(getText('tablet.newGuest.desc'));
	}
};

GuestForm.prototype._createGuest = function () {
	var self = this;
	this._btnPlay.addClassNames('disabled');
	haapi.createGuest(function (err, guestData) {
		self._btnPlay.delClassNames('disabled');
		if (err) {
			var msg = getText('ui.secureMode.error.default');
			if (err._statusCode >= 600) {
				msg = err.text;
			}
			return window.gui.openSimplePopup(msg);
		}

		var info = {
			login: guestData.login,
			password: guestData._headers.password
		};
		userPref.setValue('guestAccount', info, 1);
		return self._play(info);
	});
};

GuestForm.prototype._updateLastIdentificationTime = function () {
	window.localStorage.setItem('lastIdentification', Date.now());
};

GuestForm.prototype._play = function (info) {
	info = info || {
		login: this.guestAccount.login,
		password: this.guestAccount.password
	};
	this.emit('submit', {
		login: info.login,
		password: info.password,
		save: info.save
	});
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/screens/LoginScreen/rightColumn/GuestForm.js
 ** module id = 981
 ** module chunks = 0
 **/