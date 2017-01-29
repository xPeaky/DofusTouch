require('./LoginForm.less');
var inherits = require('util').inherits;
var WuiDom  = require('wuidom');
var Button  = require('Button');
var CheckboxLabel = require('CheckboxLabel');
var getText = require('getText').getText;
var InputBox = require('InputBox');
var keyboard = require('keyboard');
var userPref = require('UserPreferences');
var ConnectionOptions = require('./ConnectionOptions/index.js');

function LoginForm(loginScreen) {
	WuiDom.call(this, 'div', { className: ['LoginForm', 'rightColumn'], hidden: true });
	this.loginScreen = loginScreen;
	var self = this;

	// main blocks
	this.createChild('div', { className: ['frame', 'frame1'] }); // background
	var content = this.createChild('div', { className: ['content'] });
	content.createChild('div', { className: ['dofusTouchLogo'] }); // logo
	var form = content.createChild('div', { className: ['form'] });

	// login
	this._labelLogin = form.createChild('label');
	this._inputLogin = form.appendChild(new InputBox({
		className: ['inputText', 'whiteStyle'],
		attr: { type: 'text' }
	}));
	this._inputLogin.on('validate', function () {
		self._inputPassword.focus();
	});

	// password
	this._labelPassword = form.createChild('label');
	this._inputPassword = form.appendChild(new InputBox({
		className: ['inputText', 'whiteStyle'],
		attr: { type: 'password' }
	}));
	this._inputPassword.on('validate', function () {
		self._play();
	});

	// remember me
	this._rememberName = form.appendChild(new CheckboxLabel(''));

	// play button
	this._btnPlay = form.createChild('div', { className: ['horizontalCenter'] }).appendChild(new Button({
		className: ['button', 'buttonPlay'],
		sound: 'OK_BUTTON'
	}));
	this._btnPlay.on('tap', function () {
		self._play();
	});

	// connection options
	this._connectionOptions = form.appendChild(new ConnectionOptions(loginScreen, this, { forgotPassword: true }));

	// no account yet
	this._guestLink = this.appendChild(new Button({ className: 'switchAccountBtn' }, function () {
		userPref.setValue('hasAccount', false, 1);
		self.loginScreen.showGuestForm();
	}));

	// green line
	this.createChild('div', { className: 'greenLine' });
}

inherits(LoginForm, WuiDom);
module.exports = LoginForm;

LoginForm.prototype.refresh = function () {
	// Set text based on desired language
	this._labelLogin.setText(getText('ui.login.username'));
	this._labelPassword.setText(getText('ui.login.password'));
	this._btnPlay.setText(getText('ui.common.play'));
	this._rememberName.setText(getText('tablet.login.rememberMe'));
	this._guestLink.setText(getText('tablet.login.noAccount'));

	this._connectionOptions.refresh();

	this._update();
};

LoginForm.prototype._update = function update() {
	this._rememberName.toggleActivation(false, /*isSilent*/true);
	this._inputLogin.setValue('');

	// the account on the server lan have 12345678 password, the other server do not need password
	if (window.developmentMode) {
		this._inputPassword.setValue(window.Config.defaultPassword || '');
	} else {
		this._inputPassword.setValue('');
	}
};

LoginForm.prototype._play = function play() {
	keyboard.hide();

	var login    = this._inputLogin.getValue();
	var password = this._inputPassword.getValue();
	var remember = this._rememberName.isActivate();

	if (!window.developmentMode && (!login || !password)) {
		return window.gui.openSimplePopup(getText('ui.popup.accessDenied.wrongCredentials'));
	}

	this.emit('submit', {
		login: login,
		password: password,
		save: remember
	});
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/screens/LoginScreen/rightColumn/LoginForm.js
 ** module id = 988
 ** module chunks = 0
 **/