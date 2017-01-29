require('./styles.less');

var inherits = require('util').inherits;
var WuiDom = require('wuidom');

var audioManager = require('audioManager');
var Button  = require('Button');
var ContextualMenuGeneric = require('contextualMenus/ContextualMenuGeneric');
var deviceInfo = require('deviceInfo');
var dimensions = require('dimensionsHelper').dimensions;
var gt = require('getText');
var getText = gt.getText;
var haapi = require('haapi');
var helper = require('helper');
var login = require('login');
var tapBehavior = require('tapBehavior');
var userPref = require('UserPreferences');
var WebGLRenderer = require('WebGLRenderer');
var windowsManager = require('windowsManager');

var GuestForm = require('./rightColumn/GuestForm.js');
var TokenForm = require('./rightColumn/TokenForm.js');
var LoginForm = require('./rightColumn/LoginForm.js');
var NewsBlock = require('./leftColumn/NewsBlock.js');
var ForumBlock = require('./leftColumn/ForumBlock.js');
var socialData = require('./data/socialData.js');
var connectMethod = require('./data/data.js').connectMethod;

var webGlSupported = true;
var defaultConnectMethod = connectMethod.lastCharacter;

// if screen height is under this value, social buttons are going
// in the top left instead of in the left column
var SOCIAL_BUTTONS_LAYOUT_HEIGHT_THRESHOLD = 670;

// --------------------------------------------------------------
// ------------------------ Constructor -------------------------
// --------------------------------------------------------------

function LoginScreen() {
	WuiDom.call(this, 'div', { className: ['loginScreen', 'screen'], hidden: true });
	this.addClassNames('hallouineSkin');
	webGlSupported = WebGLRenderer.isWebGlSupported();
	this._connectMethod = userPref.getValue('connectMethod', defaultConnectMethod, true);
	var gui = window.gui;
	var self = this;

	this.once('show', function () {
		this._createContent();
	});

	if (webGlSupported) {
		this.on('show', this._updateContent);
		// refresh if application was left in the background on the login screen
		gui.on('appBackFromBackground', function () {
			if (self.isVisible()) {
				self._updateContent();
			}
		});
		this.on('hide', function () {
			// remove background image to free up memory
			self.delClassNames('backgroundImage');
			// close language tooltip if still open
			if (self._toolTip) {
				self._toolTip.close();
			}
		});
	}

	// triggered only when logging as a guest without haapi
	gui.on('NicknameRegistrationMessage', function () {
		windowsManager.open('nickname');
	});

	window.dofus.on('wasAlreadyConnected', function () {
		gui.openSimplePopup(
			getText('ui.connection.disconnectAccount'),
			getText('ui.popup.warning')
		);
	});
}

inherits(LoginScreen, WuiDom);
module.exports = LoginScreen;

// --------------------------------------------------------------
// ---------------------- Content creation ----------------------
// --------------------------------------------------------------

LoginScreen.prototype._createContent = function () {
	var self = this;

	if (!webGlSupported) {
		this._webGlUnsupported = this.createChild('div', { className: 'webGlUnsupported' });
		this._webGlUnsupported.setText(getText('tablet.login.webGlUnsupported'));
		return;
	}

	var verticalPositionerWrapper = this.createChild('div', { className: 'verticalPositionerWrapper' });
	var verticalPositioner = verticalPositionerWrapper.createChild('div', { className: 'verticalPositioner' });

	verticalPositioner.createChild('div', { className: 'spacer' });
	verticalPositioner.createChild('div', { className: 'spacer' });

	this._leftColumn = verticalPositioner.createChild('div', { className: 'leftColumn' });
	this._newsBlock = this._leftColumn.appendChild(new NewsBlock(this));
	this._forumBlock = this._leftColumn.appendChild(new ForumBlock(this));

	this._loginForm = verticalPositioner.appendChild(new LoginForm(this));
	this._guestForm = verticalPositioner.appendChild(new GuestForm(this));
	this._tokenForm = verticalPositioner.appendChild(new TokenForm(this));

	verticalPositioner.createChild('div', { className: 'spacer' });
	verticalPositioner.createChild('div', { className: 'spacer' });

	function registerForm(form) {
		form.on('submit', function (data) {
			data = data || {};
			self._login(data.login, data.password, data.save);
		});
	}
	registerForm(this._loginForm);
	registerForm(this._guestForm);
	registerForm(this._tokenForm);

	this.displayAppropriateForm();

	this._createLangButton();
	this._createBottomLinks();
	this._createSocialButtons();

	// for buttons click sounds
	this._audioSetup();
};

LoginScreen.prototype._createLangButton = function () {
	this._toolTip = this.appendChild(new ContextualMenuGeneric());
	var config = window.Config;
	var self = this;

	this._langButton = this.createChild('div', { className: 'langButton' });
	this._langFlag = this._langButton.createChild('div', { className: 'flag' });
	tapBehavior(this._langButton);

	this._langButton.on('tap', function () {
		var entries = [];
		var currentLang = config.language;
		for (var i = 0; i < config.serverLanguages.length; i++) {
			var lang = config.serverLanguages[i];
			var line = new WuiDom('div', { className: 'langLine' });
			line.createChild('div', { className: ['flag', lang] });
			line.createChild('div', { className: 'caption', text: lang });
			var parentCss = ['langLineParent'];
			if (lang === currentLang) {
				parentCss.push('current');
			}
			entries.push({ wuiDomChild: line, addClassNames: parentCss, lang: lang });
		}
		self._toolTip.openAround(this, { title: '', actions: entries });
	});

	this._toolTip.on('action', function (entry) {
		var lang = entry.lang;
		if (lang === config.language) {
			return;
		}

		gt.initialize({ language: lang, chaseText: config.chaseText }, function (err) {
			if (err) { return console.error('LoginScreen getText init', err); }
			config.language = lang;
			self.backToLogin();
			userPref.setValue('lang', lang, 1);
			self._updateContent();
			// update language menu cancel text
			var entries = self._toolTip.entryList.getChildren();
			entries[entries.length - 1].setText(getText('ui.common.cancel'));
		});
	});
};

LoginScreen.prototype._createBottomLinks = function () {
	var footer = this.createChild('div', { className: 'footer' });
	this._versionLabel = footer.createChild('div', { className: 'globalMenuVersion' });
	this._tou = footer.appendChild(new Button({ className: ['link'] }));
	this._gcs = footer.appendChild(new Button({ className: ['link'] }));
	function openLink() {
		helper.openUrlInAppBrowser(this.link);
	}
	this._tou.on('tap', openLink);
	this._gcs.on('tap', openLink);
};

LoginScreen.prototype._createSocialButtons = function () {
	var self = this;
	var socialBoxParent = this._leftColumn;
	if (dimensions.screenHeight < SOCIAL_BUTTONS_LAYOUT_HEIGHT_THRESHOLD) {
		socialBoxParent = self;
	}
	var socialBox = socialBoxParent.createChild('div', { className: 'socialBox' });
	var facebookButton = socialBox.appendChild(new Button({ className: ['socialNetworkButton', 'facebookButton'] }));
	var twitterButton = socialBox.appendChild(new Button({ className: ['socialNetworkButton', 'twitterButton'] }));
	var forumButton = socialBox.appendChild(new Button({ className: ['socialNetworkButton', 'forumButton'] }));

	function getSocialMediaLanguage() {
		var lang = window.Config.language;
		if (!socialData[lang]) {
			lang = socialData.fallbackLanguage;
		}
		return lang;
	}

	tapBehavior(facebookButton);
	facebookButton.on('tap', function () {
		var lang = getSocialMediaLanguage();
		self._openSocialNetwork({
			// TODO: to find the right syntax of the `fb://` url scheme on Android, we need to test the version of
			// installed Facebook app on native side (cf. http://stackoverflow.com/a/24547478)
			schemeiOS: 'fb://',
			schemeUrl: 'fb://profile/' + socialData[lang].facebookPageNumericId,
			browserUrl: 'https://www.facebook.com/' + socialData[lang].facebookPageNumericId
		});
	});

	tapBehavior(twitterButton);
	twitterButton.on('tap', function () {
		var lang = getSocialMediaLanguage();
		self._openSocialNetwork({
			schemeiOS: 'twitter://',
			schemeAndroid: 'com.twitter.android',
			schemeUrl: 'twitter://user?screen_name=' + socialData[lang].twitterAccountId,
			browserUrl: 'https://twitter.com/' + socialData[lang].twitterAccountId
		});
	});

	tapBehavior(forumButton);
	forumButton.on('tap', function () {
		helper.openUrlInAppBrowser(getText('tablet.forum.link'));
	});
};

LoginScreen.prototype._audioSetup = function () {
	var soundPrefs = userPref.getValue('soundPreferences', audioManager.getDefaultParams(), true);
	audioManager.setupChannels(soundPrefs);
	audioManager.settings.audioPath = window.Config.assetsUrl + '/audio/';
	audioManager.initialize();

	// preload the most generic button sound to be sure it will works the first time
	if (!soundPrefs.ui.muted) {
		audioManager.createUiSound('GEN_BUTTON');
	}
};

// --------------------------------------------------------------
// ------------------ Content show/hide/switch ------------------
// --------------------------------------------------------------

LoginScreen.prototype.showLoginForm = function () {
	this._loginForm.show();
	this._guestForm.hide();
	this._tokenForm.hide();
};

LoginScreen.prototype.showGuestForm = function () {
	this._loginForm.hide();
	this._guestForm.show();
	this._tokenForm.hide();
};

LoginScreen.prototype.showTokenForm = function () {
	this._loginForm.hide();
	this._guestForm.hide();
	this._tokenForm.show();
};

// Display the right form based on the current state
LoginScreen.prototype.displayAppropriateForm = function () {
	if (haapi.hasKeyFromStorage() && !window.Config.byPassToken) {
		this.showTokenForm();
	} else {
		var previouslyPlayed = userPref.getValue('hasAccount', false, true);

		if (previouslyPlayed) {
			this.showLoginForm();
		} else {
			this.showGuestForm();
		}
	}
};

/**
 * Register window will create a guest if passed as params (if no params it will use the current one) then validate
 * the guest account. On close onValidate function will be triggered with the new player account as param
 * @param {object} [guestAccount]
 * @param {string} [guestAccount.login]
 * @param {string} [guestAccount.password]
 */
LoginScreen.prototype.openRegisterWindow = function (guestAccount) {
	var self = this;
	var params = {
		guestAccount: guestAccount,
		onValidate: function (newPlayerAccountCreated) {
			self._afterValidation(newPlayerAccountCreated);
		},
		isModal: true
	};
	windowsManager.open('register', params);
};

LoginScreen.prototype._afterValidation = function (newPlayerAccountCreated) {
	if (!newPlayerAccountCreated) {
		// the account is not correctly created but the guest can be, update the UI to show the guest account
		// if there is one
		return this._updateContent();
	}

	userPref.delValue('guestAccount');
	window.localStorage.removeItem('lastIdentification');

	userPref.setValue('hasAccount', true, 1);
	window.gui.openSimplePopup(
		getText('tablet.register.done'),
		getText('ui.common.congratulation')
	);
	this.showLoginForm();
};

// Shows login screen ready to connect again.
// Called when we lost the connection or failed to connect or changed the language
LoginScreen.prototype.backToLogin = function () {
	windowsManager.closeAll();
	window.gui.splashScreen.hide();
	this.show();
};

// --------------------------------------------------------------
// -------------------------- Actions ---------------------------
// --------------------------------------------------------------

LoginScreen.prototype._login = function (account, password, save) {
	this._langButton.hide(); // no more change of language if we already logged in

	// NB: opening any window OR gui "connected" event will hide the splashScreen
	window.gui.splashScreen.show();

	function continueLoginProcess(err) {
		if (err) {
			// the error popup for the user and console error are manage by login component
			return;
		}

		window.gui.initializeAfterLogin(function (error) {
			if (error) {
				console.error('initializeAfterLogin failed:', error);
				window.gui.openSimplePopup(getText('ui.popup.connectionFailed.text'));
			}
		});
	}

	// In the case of the login with token we are not giving the account
	if (!account) {
		login.startLoginProcessWithoutPassword(this._connectMethod, continueLoginProcess);
	} else {
		login.startLoginProcessWithPassword(this._connectMethod, account, password, save, continueLoginProcess);
	}
};

// Refresh everything that needs to be on the screen (language, news, form type...)
LoginScreen.prototype._updateContent = function () {
	// background image
	this.addClassNames('backgroundImage');
	// right column
	this.displayAppropriateForm();
	this._loginForm.refresh();
	this._guestForm.refresh();
	this._tokenForm.refresh();
	// left column
	this._newsBlock.refresh();
	this._forumBlock.refresh();
	// language flag
	for (var i = 0; i < window.Config.serverLanguages.length; i++) {
		var lang = window.Config.serverLanguages[i];
		this._langFlag.toggleClassName(lang, lang === window.Config.language);
	}
	// update terms of use
	this._tou.setText(getText('tablet.legals.tou'));
	this._gcs.setText(getText('tablet.legals.gcs'));
	this._tou.link = getText('tablet.legals.link.tou');
	this._gcs.link = getText('tablet.legals.link.gcs');
	// version number
	this._versionLabel.setText(window.gui.getBuildVersion());
};

/**
 * Open a social network url in the app if possible else in browser
 *
 * @param {Object}   params
 * @param {string}   [params.schemeiOS]     - scheme to identify on ios if the app is on the device
 * @param {string}   [params.schemeAndroid] - scheme to identify on android if the app is on the device
 * @param {string}   [params.schemeUrl]     - url to open the app (if found on device)
 * @param {string}   params.browserUrl      - fallback url to open in the browser
 */
LoginScreen.prototype._openSocialNetwork = function (params) {
	if (!window.appAvailability) {
		return helper.openUrlInDeviceBrowser(params.browserUrl);
	}
	var scheme = '';
	if (deviceInfo.isIOSApp) {
		scheme = params.schemeiOS;
	} else if (deviceInfo.isAndroidApp) {
		scheme = params.schemeAndroid;
	}
	window.appAvailability.check(
		scheme,
		function () { // app is on the device
			window.open(params.schemeUrl, '_system', 'location=no');
		},
		function () { // app is not on the device
			helper.openUrlInDeviceBrowser(params.browserUrl);
		}
	);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/screens/LoginScreen/index.js
 ** module id = 979
 ** module chunks = 0
 **/