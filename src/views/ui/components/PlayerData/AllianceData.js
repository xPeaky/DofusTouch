var allianceManager = require('allianceManager');
var EventEmitter = require('events.js').EventEmitter;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var SocialGroupInvitationStateEnum = require('SocialGroupInvitationStateEnum');
var windowsManager = require('windowsManager');

function AllianceData() {
	EventEmitter.call(this);

	this.current = null;
}
inherits(AllianceData, EventEmitter);
module.exports = AllianceData;

AllianceData.prototype.connect = function () {
	this.current = null;
};

AllianceData.prototype.hasAlliance = function () {
	return this.current !== null;
};

AllianceData.prototype.isBoss = function () {
	if (!this.current || !this.current.guilds.length) {
		return false;
	}

	var firstGuild = this.current.guilds[0]; // first guild is the alliance leader
	var playerGuild = window.gui.playerData.guild;
	return firstGuild.guildId === playerGuild.current.guildId && playerGuild.isBoss();
};


AllianceData.prototype.initialize = function (gui) {
	var self = this;

	// the player is already a member of an alliance. We receive this message after login.
	gui.on('AllianceMembershipMessage', function (msg) {
		if (!self.current) {
			self.current = allianceManager.createAlliance(msg.allianceInfo);
		} else {
			self.current.setInfo(msg.allianceInfo);
		}
		self.current.enabled = msg.enabled;
	});

	gui.on('AllianceJoinedMessage', function (msg) {
		self.current = allianceManager.createAlliance(msg.allianceInfo);
		self.current.enabled = msg.enabled;
		gui.chat.logMsg(getText('ui.alliance.joinAllianceMessage', [msg.allianceInfo.allianceName]));
		self.emit('allianceJoined');
	});

	gui.on('AllianceGuildLeavingMessage', function (msg) {
		var guilds = self.current.guilds;
		for (var i = 0, len = guilds.length; i < len; i += 1) {
			if (guilds[i].guildId === msg.guildId) {
				guilds.splice(i, 1);
				self.emit('guildLeft', msg.guildId);
				return;
			}
		}
	});

	gui.on('AllianceLeftMessage', function () {
		self.current = null;
		self.emit('allianceLeft');
	});

	gui.on('AllianceInsiderInfoMessage', function (msg) {
		var allianceData = msg.allianceInfos;
		allianceData.guilds = msg.guilds;
		allianceData.prisms = msg.prisms;
		if (!self.current) {
			self.current = allianceManager.createAlliance(allianceData);
		} else {
			self.current.setInfo(allianceData);
		}

		self.emit('allianceUpdated', self.current);
	});

	gui.on('AllianceInvitationStateRecruterMessage', function (msg) {
		if (msg.invitationState !== SocialGroupInvitationStateEnum.SOCIAL_GROUP_INVITATION_SENT) {
			return windowsManager.close('cancel');
		}

		gui.openCancelPopup({
			title: getText('ui.common.invitation'),
			message: getText('ui.craft.waitForCraftClient', msg.recrutedName),
			cb: function () { window.dofus.sendMessage('AllianceInvitationAnswerMessage', { accept: false }); }
		});
	});

	gui.on('AllianceInvitationStateRecrutedMessage', function (msg) {
		if (msg.invitationState === SocialGroupInvitationStateEnum.SOCIAL_GROUP_INVITATION_CANCELED) {
			return windowsManager.close('confirm');
		}
	});

	gui.on('AllianceInvitedMessage', function (msg) {
		window.gui.openConfirmPopup({
			title: getText('ui.common.invitation'),
			message: getText('ui.alliance.youAreInvited', msg.recruterName, msg.allianceInfo.allianceName),
			cb: function (result) { window.dofus.sendMessage('GuildInvitationAnswerMessage', { accept: result }); }
		});
	});

	gui.on('PrismsListUpdateMessage', function (msg) {
		if (!self.current) {
			return;
		}

		var prisms = msg.prisms;
		var updated = [];
		var deleted = [];
		var prismList = self.current.prisms;

		for (var i = 0, len = prisms.length; i < len; i += 1) {
			var prism = prisms[i];

			if (prism._type === 'PrismGeolocalizedInformation' && prism.prism._type === 'AllianceInsiderPrismInformation') {
				prism.prism.alliance = self.current;
				prismList[prism.subAreaId] = prism;
				updated.push(prism);
			} else if (prismList[prism.subAreaId]) { // the subarea no longer belongs to the alliance
				delete prismList[prism.subAreaId];
				deleted.push(prism.subAreaId);
			}
		}

		if (updated.length) {
			self.emit('prismUpdatedList', updated);
		}

		if (deleted.length) {
			self.emit('prismDeletedList', deleted);
		}
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/AllianceData.js
 ** module id = 518
 ** module chunks = 0
 **/