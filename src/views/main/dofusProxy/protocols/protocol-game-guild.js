var connectionManager = require('dofusProxy/connectionManager.js');


// GuildCreationStartedMessage
connectionManager.on('GuildCreationStartedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildModificationStartedMessage
connectionManager.on('GuildModificationStartedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildCreationResultMessage
connectionManager.on('GuildCreationResultMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildInvitedMessage
connectionManager.on('GuildInvitedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildInvitationStateRecruterMessage
connectionManager.on('GuildInvitationStateRecruterMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildInvitationStateRecrutedMessage
connectionManager.on('GuildInvitationStateRecrutedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('GuildJoinedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildMemberOnlineStatusMessage
connectionManager.on('GuildMemberOnlineStatusMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildInformationsGeneralMessage
connectionManager.on('GuildInformationsGeneralMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildInformationsMembersMessage
connectionManager.on('GuildInformationsMembersMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildMemberWarnOnConnectionStateMessage
connectionManager.on('GuildMemberWarnOnConnectionStateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildInformationsMemberUpdateMessage
connectionManager.on('GuildInformationsMemberUpdateMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @param {object} msg - msg
 * @param {String} msg.paddocksInformations[*].enrichData.areaName
 * @param {String} msg.paddocksInformations[*].enrichData.subAreaName
 * @param {Number} msg.paddocksInformations[*].enrichData.worldX
 * @param {Number} msg.paddocksInformations[*].enrichData.worldY
 * @param {String} msg.paddocksInformations[*].mountsInformations[*].enrichData.mountType
 */
connectionManager.on('GuildInformationsPaddocksMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildMemberLeavingMessage
connectionManager.on('GuildMemberLeavingMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('GuildLeftMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildMembershipMessage
connectionManager.on('GuildMembershipMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildLevelUpMessage

// GuildInfosUpgradeMessage
connectionManager.on('GuildInfosUpgradeMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @param {object} msg - msg
 * @param {String} msg.housesInformations[*].enrichData.areaName
 * @param {String} msg.housesInformations[*].enrichData.subAreaName
 * @param {String} msg.housesInformations[*].enrichData.houseName
 */
connectionManager.on('GuildHousesInformationMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @param {object} msg - msg
 * @param {String} msg.housesInformations.enrichData.areaName
 * @param {String} msg.housesInformations.enrichData.subAreaName
 * @param {String} msg.housesInformations.enrichData.houseName
 */
connectionManager.on('GuildHouseUpdateInformationMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildHouseRemoveMessage
connectionManager.on('GuildHouseRemoveMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

/**
 * @param {object} msg - msg
 * @param {String} msg.paddockInfo.enrichData.areaName
 * @param {String} msg.paddockInfo.enrichData.subAreaName
 * @param {Number} msg.paddockInfo.enrichData.worldX
 * @param {Number} msg.paddockInfo.enrichData.worldY
 * @param {String} msg.paddockInfo.mountsInformations[*].enrichData.mountType
 */
connectionManager.on('GuildPaddockBoughtMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('GuildPaddockRemovedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('GuildFactsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

connectionManager.on('GuildInAllianceFactsMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// GuildListMessage

// GuildVersatileInfoListMessage

/**
 * @event module:protocol/gameGuild.client_ChallengeFightJoinRefusedMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.playerId - id of the character that can not be joined
 * @param {number} msg.reason   - reason why the join request was refused
 */
connectionManager.on('ChallengeFightJoinRefusedMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-guild.js
 ** module id = 125
 ** module chunks = 0
 **/