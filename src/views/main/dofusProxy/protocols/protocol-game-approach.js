/**
 * @module protocol/gameApproach
 */

var connectionManager = require('dofusProxy/connectionManager.js');


// HelloGameMessage is handled in lib/services/connectionManager.js

/**
 * @event module:protocol/gameApproach.client_AuthenticationTicketAcceptedMessage
 * @desc TODO: decide if needed
 */

/**
 * @event module:protocol/gameApproach.client_AuthenticationTicketRefusedMessage
 * @desc TODO: decide if needed
 */

/**
 * @event module:protocol/gameApproach.client_AlreadyConnectedMessage
 * @desc Ignored. We get this info in IdentificationSuccessMessage instead
 */

/**
 * @event module:protocol/gameApproach.client_AccountLoggingKickedMessage
 * @desc Seems obsolete from Ankama's code. Anyway we simply disconnect.
 * TODO: check with Ankama if we need an error message in which case we should move this handler to proxy server code.
 */
connectionManager.on('AccountLoggingKickedMessage', function () {
	window.gui.disconnect('AccountLoggingKickedMessage');
	window.isoEngine.disconnect();
});

/**
 * @event module:protocol/gameApproach.client_ServerSettingsMessage
 */
connectionManager.on('ServerSettingsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/gameApproach.client_ServerSessionConstantsMessage
 */
connectionManager.on('ServerSessionConstantsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/gameApproach.client_ServerOptionalFeaturesMessage
 */
connectionManager.on('ServerOptionalFeaturesMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/gameApproach.client_AccountCapabilitiesMessage
 * @desc TODO
 */
connectionManager.on('AccountCapabilitiesMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-approach.js
 ** module id = 72
 ** module chunks = 0
 **/