var userPref = require('UserPreferences');
var haapi = require('haapi');
var deviceInfo = require('deviceInfo');
var getText = require('getText').getText;
var getIdentFailureMsg = require('./getIdentFailureMsg.js');
var getHaapiFailureMsg = require('./getHaapiFailureMsg.js');
var IdentFailureReasonExtEnum = require('IdentificationFailureReasonExtendedEnum');

var reloginPending = false;

exports.characterId = null;

// on login, auto-connect with the logic behind this method. There are four connectMethod:
// - manual: go to the server selection window
// - lastServer: go to the character selection window
// - lastCharacter: enter directly the game with the last character you played with
// - characterId: connect directly on an character with the id given by exports.characterId from the game using the
// drop down menu in the setting menu
exports.connectMethod = null;
exports.lastServerId = null;

exports.startLoginProcessWithPassword = function (connectMethod, username, password, save, cb) {
	startLoginProcess(connectMethod, {
		account: username,
		password: password,
		save: save
	}, cb);
};

exports.startLoginProcessWithoutPassword = function (connectMethod, cb) {
	startLoginProcess(connectMethod, {}, cb);
};

function handleLoginError(err) {
	if (err.reason) {
		if (err.reason !== IdentFailureReasonExtEnum.INCOMPATIBLE_VERSIONS) {
			// getIdentFailureMsg is doing the console.error
			window.gui.openSimplePopup(getIdentFailureMsg(err), getText('ui.popup.accessDenied'));
		} else {
			// we do not want console.error here
			var message, url;

			if (deviceInfo.isAndroidApp) {
				// Android case
				message = getText('tablet.ui.popup.accessDenied.incompatibleVersionsAndroid');
				url = 'market://details?id=com.ankama.dofustouch';
			} else if (deviceInfo.isIOSApp) {
				// iOS case
				message = getText('tablet.ui.popup.accessDenied.incompatibleVersionsIOS');
				url = 'https://itunes.apple.com/app/id1041406978';
			} else {
				// generic version of the message
				message = getText('tablet.ui.popup.accessDenied.incompatibleVersions');
			}

			window.gui.openConfirmPopup({
				title: getText('ui.popup.accessDenied'),
				message: message,
				cb: function (result) {
					if (!result) {
						return;
					}
					if (url) {
						window.open(url, '_system', 'location=no');
					}
				}
			});
		}
	} else {
		window.gui.openSimplePopup(getText('ui.popup.connectionFailed.text'));
		console.warn('login error without reason:', err);
	}
}

/** Called for login (manual or automatic)
 *  @param {string} connectMethod - "manual" or "lastServer" or "lastCharacter" or "characterId" or null
 *  @param {Object} [opts]
 *  @param {string} [opts.account]
 *  @param {string} [opts.password]
 *  @param {boolean} [opts.save]
 *  @param {function} [cb] - called with error if any or null if success
 */
function startLoginProcess(connectMethod, opts, cb) {
	opts = opts || {};
	cb = cb || function (error) {
		if (error) {
			return console.error(error);
		}
	};

	function haapiCallback(error, response) {
		if (error) {
			window.gui.openSimplePopup(
				// getHaapiFailureMsg is doing the console.error
				getHaapiFailureMsg(error),
				getText('ui.popup.accessDenied')
			);
			return cb(error);
		}

		window.dofus.setCredentials(opts.account || response.username, response.token);
		window.gui.playerData.setLoginName(response.username);

		exports.connectMethod = connectMethod;
		window.dofus.login(function (err) {
			reloginPending = false;
			if (err) {
				window.dofus.disconnect();
				return handleLoginError(err);
			}

			exports.lastServerId = userPref.getValue('lastServerId');
			return cb();
		});
	}

	// to by pass haapi if it is down
	if (window.Config.byPassToken) {
		haapiCallback(null, { username: opts.account, token: opts.password });
		return;
	}

	if (opts.account) {
		// Check if this is an admin forced login
		var haapiUser = opts.account;
		var users = haapiUser.split('|');
		if (users.length === 2) {
			haapiUser = users[0];
		}

		haapi.login(haapiUser, opts.password, opts.save, haapiCallback);
	} else {
		haapi.login(haapiCallback);
	}
}

exports.reconnectByCharId = function (characterId) {
	exports.characterId = characterId;
	reloginPending = true;
	window.dofus.disconnect();
	window.gui._shutDownUI();
	exports.startLoginProcessWithoutPassword('characterId');
};

/** Called to remember which is the last server we connected to with current account */
exports.selectServer = function (serverId) {
	var prevServerId = userPref.getValue('lastServerId');
	if (prevServerId !== serverId) {
		userPref.setValue('lastServerId', serverId);
	}
	exports.lastServerId = serverId;
};

/** Shows login screen ready to connect again.
 *  Called when we lost the connection or failed to connect
 */
exports.backToLogin = function () {
	if (reloginPending) {
		return;
	}

	window.gui.loginScreen.backToLogin();
};

/** Executes a series of steps necessary to bring the user back to the server or character selection.
 *  In the background this means doing a bunch of things (also because of constraints from Ankama servers)
 *  but the caller of this function should not need to care.
 *  @param {string} serverOrCharacter - 'server' | 'character'
 */
exports.goBackToSelectionOf = function (serverOrCharacter) {
	// we want to login again without showing the login screen...
	window.gui.splashScreen.show();
	window.gui.loginScreen.hide();
	reloginPending = true;
	window.dofus.disconnect();

	var connectMethod = serverOrCharacter === 'character' ? 'lastServer' : null;
	exports.startLoginProcessWithoutPassword(connectMethod);
};

/** This is called when we are about to "fully" reconnect.
 *  This also means that a quick reco was not possible so we had to disconnect and will relogin automatically */
exports.onFullReconnection = function () {
	window.gui.splashScreen.show();
	window.gui.loginScreen.hide();

	exports.connectMethod = 'lastCharacter';
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/login/index.js
 ** module id = 50
 ** module chunks = 0
 **/