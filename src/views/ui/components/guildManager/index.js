var getText = require('getText').getText;
var Guild = require('./Guild.js');
var SocialGroupCreationResultEnum = require('SocialGroupCreationResultEnum');
var windowsManager = require('windowsManager');

exports.Emblem = require('./Emblem.js');
exports.GuildRightsBitEnum = require('./GuildRightsBitEnum.js');

var guilds = exports.guilds = {};

exports.createGuild = function (guildInfo) {
	var guild = new Guild(guildInfo);
	guilds[guild.guildId] = guild;
	return guild;
};

exports.initialize = function (gui) {
	gui.on('GuildCreationResultMessage', function (msg) {
		switch (msg.result) {
			case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_ALREADY_IN_GROUP:
				return window.gui.openSimplePopup(getText('ui.guild.alreadyInGuild'));
			case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_EMBLEM_ALREADY_EXISTS :
				return window.gui.openSimplePopup(getText('ui.guild.AlreadyUseEmblem'));
			case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_NAME_ALREADY_EXISTS :
				return window.gui.openSimplePopup(getText('ui.guild.AlreadyUseName'));
			case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_NAME_INVALID :
				return window.gui.openSimplePopup(getText('ui.guild.invalidName'));
			case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_REQUIREMENT_UNMET :
				return window.gui.openSimplePopup(getText('ui.guild.requirementUnmet'));
			case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_OK :
				return windowsManager.close('socialGroupCreation');
			case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_EMBLEM_INVALID :
			case SocialGroupCreationResultEnum.SOCIAL_GROUP_CREATE_ERROR_UNKNOWN :
				return window.gui.openSimplePopup(getText('ui.common.unknownFail'));
		}
	});


	function openGuildCard(guildFact) {
		windowsManager.getWindow('guildCard').display(guildFact);
	}

	gui.on('GuildInAllianceFactsMessage', openGuildCard);
	gui.on('GuildFactsMessage', openGuildCard);

	window.dofus.connectionManager.on('GuildFactsErrorMessage', function () {
		gui.chat.logMsg(getText('ui.guild.doesntExistAnymore'));
	});
};

exports.openGuildCard = function (guildId) {
	window.dofus.sendMessage('GuildFactsRequestMessage', { guildId: guildId });
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/guildManager/index.js
 ** module id = 338
 ** module chunks = 0
 **/