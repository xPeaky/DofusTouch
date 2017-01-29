require('./style.less');
var inherits = require('util').inherits;
var WuiDom  = require('wuidom');
var Button  = require('Button');
var getText = require('getText').getText;
var helper = require('helper');
var Selector = require('Selector');
var userPref = require('UserPreferences');
var data = require('../../data/data.js');

function ConnectionOptions(loginScreen, parent, options) {
	WuiDom.call(this, 'div', { className: 'ConnectionOptions' });
	this.loginScreen = loginScreen;
	options = options || {};
	var self = this;

	// new line (for `forgot password` and `connection options`)
	this._bottomLinks = this.appendChild(new Button({ className: 'bottomLinks' }));

	// forgot password button
	if (options.forgotPassword) {
		this._forgottenPassword = this._bottomLinks.appendChild(new Button({ className: 'forgottenPassword' }));
		this._forgottenPassword.on('tap', function () {
			helper.openUrlInAppBrowser(this.link);
		});
	}

	// connection options button
	this._connectionOptions = this._bottomLinks.appendChild(new Button({ className: 'connectionOptions' }));
	this._connectionOptions.on('tap', function () {
		var shouldShow = !self._advancedOptions.isVisible();
		self._advancedOptions.toggleDisplay(shouldShow);
		self._connectionOptions.toggleClassName('selected', shouldShow);
		if (shouldShow) {
			self._update();
		}
	});

	// connection options panel
	this._advancedOptions = this.createChild('div', { className: 'advancedOptions' });
	this._advancedOptions.hide();

	// gray line separator
	this._grayLine = this._advancedOptions.createChild('div', { className: 'grayLine' });

	// connection options dropdown
	this.connectionMethodSelector = this._advancedOptions.appendChild(new Selector({ className: '' }));
	this._advancedOptions.createChild('div', { className: 'clearFloat' });
	this.connectionMethodSelector.on('change', function (value) {
		self.loginScreen._connectMethod = value;
		userPref.setValue('connectMethod', value, null, true);
	});
}

inherits(ConnectionOptions, WuiDom);
module.exports = ConnectionOptions;

ConnectionOptions.prototype.refresh = function () {
	if (this._forgottenPassword) {
		this._forgottenPassword.setText(getText('ui.login.forgottenPassword'));
		// following text code should be 'ui.link.findPassword' but english is outdated in the database
		this._forgottenPassword.link = getText('tablet.link.findPassword');
	}
	this._connectionOptions.setText(getText('tablet.login.connectionOptions'));

	this.connectionMethodSelector.clearContent();
	for (var connectMethod in data.connectMethod) {
		this.connectionMethodSelector.addOption(getText('tablet.login.connectionOption.' + connectMethod), connectMethod);
	}
	this._update();
};

ConnectionOptions.prototype._update = function () {
	this.connectionMethodSelector.select(this.loginScreen._connectMethod, true);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/screens/LoginScreen/rightColumn/ConnectionOptions/index.js
 ** module id = 983
 ** module chunks = 0
 **/