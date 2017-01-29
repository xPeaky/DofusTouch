/**
 * @module protocol/connection
 */

var connectionManager = require('dofusProxy/connectionManager.js');


/**
 * @event module:protocol/connection.client_HelloConnectMessage
 * @desc Done in lib/services/connectionManager.js
 */

/**
 * @event module:protocol/connection.client_CredentialsAcknowledgementMessage
 * @desc Needed?
 */

/**
 * @event module:protocol/connection.client_IdentificationSuccessMessage
 */
connectionManager.on('IdentificationSuccessMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('IdentificationSuccessWithLoginTokenMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/connection.client_IdentificationFailedMessage
 * @desc Done in src/views/main/dofusProxy/index.js
 */

/**
 * @event module:protocol/connection.client_IdentificationFailedBannedMessage
 * @desc Done in src/views/main/dofusProxy/index.js
 */

/**
 * @event module:protocol/connection.client_IdentificationFailedForBadVersionMessage
 * @desc Done in src/views/main/dofusProxy/index.js
 */

/**
 * @event module:protocol/connection.client_ServersListMessage
 */
connectionManager.on('ServersListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/connection.client_ServerStatusUpdateMessage
 */
connectionManager.on('ServerStatusUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @event module:protocol/connection.client_SelectedServerDataMessage
 * @desc Done in src/views/main/dofusProxy/index.js
 */

/**
 * @event module:protocol/connection.client_SelectedServerDataExtendedMessage
 * @desc TODO
 */

/**
 * @event module:protocol/connection.client_SelectedServerRefusedMessage
 * @desc Also done in src/views/main/dofusProxy/index.js (TODO: what now?)
 */
connectionManager.on('SelectedServerRefusedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('AuthenticationTicketAcceptedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-connection.js
 ** module id = 61
 ** module chunks = 0
 **/