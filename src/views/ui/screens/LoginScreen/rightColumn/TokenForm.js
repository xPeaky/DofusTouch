require('./TokenForm.less');
var inherits = require('util').inherits;
var WuiDom  = require('wuidom');
var Button  = require('Button');
var getText = require('getText').getText;
var haapi = require('haapi');
var ConnectionOptions = require('./ConnectionOptions/index.js');

function TokenForm(loginScreen) {
	WuiDom.call(this, 'div', { className: ['TokenForm', 'rightColumn'], hidden: true });
	this.loginScreen = loginScreen;
	var self = this;

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
		self._play();
	});

	// connection options
	this._connectionOptions = form.appendChild(new ConnectionOptions(loginScreen, this));

	// not my account
	this._guestLink = this.appendChild(new Button({ className: 'switchAccountBtn' }, function () {
		haapi.resetHaapiKey();
		self.loginScreen.showLoginForm();
	}));

	// green line
	this.createChild('div', { className: 'greenLine' });
}

inherits(TokenForm, WuiDom);
module.exports = TokenForm;

TokenForm.prototype.refresh = function () {
	var userName = haapi.getHaapiUsername();

	this._introText.setText(getText('tablet.token.desc', userName));
	this._btnPlay.setText(getText('ui.common.play'));
	this._guestLink.setText(getText('tablet.token.notme', userName));
	this._connectionOptions.refresh();

	this._update();
};

TokenForm.prototype._update = function update() {
	// nothing for now
};

TokenForm.prototype._play = function play() {
	this.emit('submit');
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/screens/LoginScreen/rightColumn/TokenForm.js
 ** module id = 986
 ** module chunks = 0
 **/