var getText = require('getText').getText;
var GameHierarchyEnum = require('GameHierarchyEnum');
var PlayerStateEnum = require('PlayerStateEnum');

module.exports = function basicWhoIsMessageHandler(msg) {
	var areaName;
	if (msg.areaId !== -1) {
		areaName = msg._areaName;
	} else {
		areaName = getText('ui.common.unknowArea');
	}

	var notice = '{player,' + msg.playerName + ',' + msg.playerId + '}';

	if (msg.position === GameHierarchyEnum.MODERATOR) {
		// should have color and bold > XmlConfig.getInstance().getEntry("colors.hierarchy.moderator")
		notice += '(' + getText('ui.common.moderator') + ')';
	} else if (msg.position === GameHierarchyEnum.GAMEMASTER_PADAWAN) {
		// should have color and bold > XmlConfig.getInstance().getEntry("colors.hierarchy.gamemaster_padawan")
		notice += '(' + getText('ui.common.gameMasterAssistant') + ')';
	} else if (msg.position === GameHierarchyEnum.GAMEMASTER) {
		// should have color and bold > XmlConfig.getInstance().getEntry("colors.hierarchy.gamemaster")
		notice += '(' + getText('ui.common.gameMaster') + ')';
	} else if (msg.position === GameHierarchyEnum.ADMIN) {
		// should have color and bold > XmlConfig.getInstance().getEntry("colors.hierarchy.administrator")
		notice += '(' + getText('ui.common.administrator') + ')';
	}

	var text = getText('ui.common.whois', msg.accountNickname, notice, areaName);

	if (msg.socialGroups && msg.socialGroups.length > 0) {
		for (var i = 0, len = msg.socialGroups.length; i < len; i += 1) {
			var socialGroup = msg.socialGroups[i];
			if (socialGroup._type === 'GuildInformations') {
				text += ' ' + getText('ui.common.guild') + ' {guild,' + socialGroup.guildId + '::' +
					socialGroup.guildName + '}';
			}
			if (socialGroup._type === 'AllianceInformations') {
				text += ' ' + getText('ui.common.alliance') + ' {alliance,' + socialGroup.allianceId + '::[' +
					socialGroup.allianceTag + ']}';
			}
		}
	}

	if (msg.playerState === PlayerStateEnum.NOT_CONNECTED) {
		text += ' (' + getText('tablet.common.disconnected') + ')';
	}

	return text;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Chat/basicWhoIsMessageHandler.js
 ** module id = 454
 ** module chunks = 0
 **/