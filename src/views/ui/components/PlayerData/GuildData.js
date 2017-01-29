var connectionManager = require('dofusProxy/connectionManager.js');
var guildManager = require('guildManager');
var GuildRightsBitEnum = guildManager.GuildRightsBitEnum;
var GuildInformationsTypeEnum = require('GuildInformationsTypeEnum');
var EventEmitter = require('events.js').EventEmitter;
var getText = require('getText').getText;
var helper = require('helper');
var inherits = require('util').inherits;
var SocialGroupInvitationStateEnum = require('SocialGroupInvitationStateEnum');
var windowsManager = require('windowsManager');
var PlayerStatusEnum = require('PlayerStatusEnum');
var MoodResultEnum = require('MoodResultEnum');
var LEADER_ID = 1;


function GuildData() {
	EventEmitter.call(this);

	this.current = null;
}

inherits(GuildData, EventEmitter);
module.exports = GuildData;


GuildData.prototype._reset = function () {
	this.current = null;
};


GuildData.prototype.disconnect = function () {
	this._reset();
};


GuildData.prototype.hasGuild = function () {
	return this.current !== null;
};


GuildData.prototype.checkRight = function (right, memberRights) {
	return (right & memberRights) > 0;
};


/**
 * whether the player has the requested right

 * @param {number} right - GuildRightsBitEnum
 * @returns {Boolean}
 */
GuildData.prototype.hasRight = function (right) {
	if (this.isBoss()) {
		return true;
	}

	return this.checkRight(right, this.current.memberRights);
};


GuildData.prototype.isBoss = function () {
	if (this.current.leaderId === window.gui.playerData.id) {
		return true;
	}
	return this.checkRight(GuildRightsBitEnum.GUILD_RIGHT_BOSS, this.current.memberRights);
};


GuildData.prototype.isAMember = function (playerId) {
	return this.current.members.hasOwnProperty(playerId);
};


GuildData.prototype._initPerceptors = function () {
	this.current.perceptors = {
		nbcollectorMax: 0,
		informationsOrderList: [],
		perceptorsMap: {}
	};

	return this.current.perceptors;
};


GuildData.prototype.getPerceptors = function () {
	var perceptors = this.current.perceptors;

	if (!perceptors) {
		perceptors = this._initPerceptors();
	}

	return perceptors;
};


GuildData.prototype.getPerceptor = function (collectorId) {
	var perceptors = this.getPerceptors();
	return perceptors.perceptorsMap[collectorId];
};


GuildData.prototype.initialize = function (gui) {
	var self = this;

	gui.on('GuildMembershipMessage', function (msg) {
		if (!self.current || self.current.guildId !== msg.guildInfo.guildId) {
			self.current = guildManager.createGuild(msg.guildInfo);
		}
		self.current.enabled = msg.enabled;
		self.current.memberRights = msg.memberRights;
	});

	gui.on('GuildJoinedMessage', function (msg) {
		self.current = guildManager.createGuild(msg.guildInfo);
		self.current.enabled = msg.enabled;
		self.current.memberRights = msg.memberRights;

		gui.chat.logMsg(getText('ui.guild.JoinGuildMessage', [msg.guildInfo.guildName]));
	});

	gui.on('GuildInformationsGeneralMessage', function (msg) {
		var current = self.current;
		current.level = msg.level;
		current.creationDate = msg.creationDate;
		current.abandonnedPaddock = msg.abandonnedPaddock;
		current.experience = msg.experience;
		current.expNextLevelFloor = msg.expNextLevelFloor;

		// 0 (0%) -> 1 (100%)
		current.experiencePercentage = (msg.experience - msg.expLevelFloor) / (msg.expNextLevelFloor - msg.expLevelFloor);

		self.emit('GuildGeneralInformationUpdate');
	});

	gui.on('GuildInformationsMembersMessage', function (msg) {
		var current = self.current;
		var connectedMembers = 0;
		var members = {};
		var totalMembers = msg.members.length;
		var averageLevel = 0;

		for (var i = 0; i < totalMembers; i++) {
			var member = msg.members[i];
			averageLevel += member.level;

			if (member.rank === LEADER_ID) {
				current.leaderId = member.id;
			}
			if (member.connected) {
				connectedMembers += 1;
			}

			members[member.id] = member;
		}

		current.members = members;
		current.averageMemberLevel = Math.floor(averageLevel / totalMembers);
		current.nbMembers = totalMembers;
		current.nbConnectedMembers = connectedMembers;

		self.emit('guildMemberCountUpdate');
		self.emit('guildMember', current.getMembersByRank());
	});

	gui.on('GuildInformationsMemberUpdateMessage', function (msg) {
		var current = self.current;
		var member = msg.member;
		current.members[member.id] = member;

		if (member.rank === LEADER_ID) {
			current.leaderId = member.id;
		}

		self.emit('guildMember', current.getMembersByRank());
	});

	gui.on('GuildMemberLeavingMessage', function (msg) {
		var current = self.current;
		var members = current.members;
		delete members[msg.memberId];

		var connectedMembers = 0;
		var totalMembers = 0;

		for (var id in members) {
			var member = members[id];
			if (member.connected) {
				connectedMembers += 1;
			}
			totalMembers += 1;
		}

		current.nbMembers = totalMembers;
		current.nbConnectedMembers = connectedMembers;

		self.emit('guildMemberCountUpdate');
		self.emit('guildMember', self.current.getMembersByRank());
	});

	gui.on('GuildMemberOnlineStatusMessage', function (msg) {
		var current = self.current;
		var member = current.members[msg.memberId];
		if (!member) { return; } // reconnection in fight

		if (msg.online) {
			member.connected = 1;
			member.status.statusId = PlayerStatusEnum.PLAYER_STATUS_AVAILABLE;
			current.nbConnectedMembers++;
		} else {
			member.connected = 0;
			member.status.statusId = PlayerStatusEnum.PLAYER_STATUS_OFFLINE;
			current.nbConnectedMembers--;
		}

		self.emit('guildMemberCountUpdate');
		self.emit('guildMember', current.getMembersByRank());
	});

	connectionManager.on('PlayerStatusUpdateMessage', function (msg) {
		if (!self.current) {
			return;
		}

		var member = self.current.members[msg.playerId];
		if (member) {
			member.status = msg.status;
			self.emit('guildMemberStatusUpdate', member);
		}
	});

	gui.on('GuildMemberWarnOnConnectionStateMessage', function (msg) {
		if (self.current) {
			self.current.warnMemberOnConnectionState = msg.enable;
		}
	});

	gui.on('GuildLeftMessage', function () {
		self.current = null;
		self.emit('guildLeft');
	});

	gui.on('GuildInvitationStateRecruterMessage', function (msg) {
		if (msg.invitationState === SocialGroupInvitationStateEnum.SOCIAL_GROUP_INVITATION_OK) {
			window.dofus.sendMessage('GuildGetInformationsMessage', { infoType: GuildInformationsTypeEnum.INFO_MEMBERS });
		}

		if (msg.invitationState !== SocialGroupInvitationStateEnum.SOCIAL_GROUP_INVITATION_SENT) {
			return windowsManager.close('cancel');
		}

		gui.openCancelPopup({
			title: getText('ui.common.invitation'),
			message: getText('ui.craft.waitForCraftClient', msg.recrutedName),
			cb: function () { window.dofus.sendMessage('GuildInvitationAnswerMessage', { accept: false }); }
		});
	});

	gui.on('GuildInvitationStateRecrutedMessage', function (msg) {
		if (msg.invitationState === SocialGroupInvitationStateEnum.SOCIAL_GROUP_INVITATION_CANCELED) {
			return windowsManager.close('confirm');
		}
	});

	gui.on('GuildInvitedMessage', function (msg) {
		window.gui.openConfirmPopup({
			title: getText('ui.common.invitation'),
			message: getText('ui.social.aInvitYouInGuild', msg.recruterName, msg.guildInfo.guildName),
			cb: function (result) { window.dofus.sendMessage('GuildInvitationAnswerMessage', { accept: result }); }
		});
	});

	gui.on('GuildInformationsPaddocksMessage', function (msg) {
		if (!self.current) {
			return;
		}

		self.current.paddocks = msg.paddocksInformations || [];
		self.emit('guildPaddockUpdate');
	});

	gui.on('GuildPaddockBoughtMessage', function (msg) {
		if (!self.current) {
			return;
		}

		if (!self.current.paddocks) {
			self.current.paddocks = [];
		}

		self.current.paddocks.push(msg.paddockInfo);
		self.emit('guildPaddockBought', msg.paddockInfo);
	});

	gui.on('GuildPaddockRemovedMessage', function (msg) {
		if (!self.current || !self.current.paddocks) {
			return;
		}

		var paddockId = msg.paddockId;

		if (helper.removeObjectInArrayById(self.current.paddocks, 'paddockId', paddockId)) {
			self.emit('guildPaddockRemoved', paddockId);
		}
	});

	gui.on('GuildHousesInformationMessage', function (msg) {
		if (!self.current) {
			return;
		}

		self.current.houses = msg.housesInformations || [];
		self.emit('guildHouseUpdateAll');
	});

	gui.on('GuildHouseUpdateInformationMessage', function (msg) {
		if (!self.current) {
			return;
		}

		if (!self.current.houses) {
			self.current.houses = [];
		}

		self.current.houses.push(msg.housesInformations);
		self.emit('guildHouseUpdateInfo', msg.housesInformations);
	});

	gui.on('GuildHouseRemoveMessage', function (msg) {
		if (!self.current || !self.current.houses) {
			return;
		}

		var houseId = msg.houseId;

		if (helper.removeObjectInArrayById(self.current.houses, 'houseId', houseId)) {
			self.emit('guildHouseRemoved', houseId);
		}
	});

	gui.on('MoodSmileyUpdateMessage', function (msg) {
		var guildMember = self.current && self.current.members[msg.playerId];
		if (!guildMember) {
			return;
		}
		guildMember.moodSmileyId = msg.smileyId;
		self.emit('guildMember', self.current.getMembersByRank());
	});

	gui.on('MoodSmileyResultMessage', function (msg) {
		if (msg.resultCode !== MoodResultEnum.MOOD_OK) {
			return;
		}
		var guildMember = self.current && self.current.members[window.gui.playerData.id];
		if (!guildMember) {
			return;
		}
		guildMember.moodSmileyId = msg.smileyId;
		self.emit('guildMember', self.current.getMembersByRank());
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/GuildData.js
 ** module id = 526
 ** module chunks = 0
 **/