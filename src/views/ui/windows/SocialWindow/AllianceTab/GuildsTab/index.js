require('./styles.less');
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var AgrStatus = require('AggressableStatusEnum');
var AllianceRightsBitEnum = require('AllianceRightsBitEnum');
var addTooltip = require('TooltipBox').addTooltip;
var CheckboxLabel = require('CheckboxLabel');
var EmblemLogo = require('EmblemLogo');
var getText = require('getText').getText;
var guildManager = require('guildManager');
var inherits = require('util').inherits;
var Table = require('TableV2');
var tapBehavior = require('tapBehavior');
var Button = require('Button');
var WuiDom = require('wuidom');

function GuildsTab() {
	WuiDom.call(this, 'div', { className: 'GuildsTab' });

	this._createDom();

	this.on('allianceUpdated', function (alliance) {
		this.table.clearContent();
		this.table.addList(alliance.guilds);
		this.table.setContentLoading(false);
	});

	this.on('allianceUpdateRequested', function () {
		this.table.setContentLoading(true);
	});

	var self = this;
	window.gui.playerData.alliance.on('guildLeft', function (guildId) {
		self.table.delRow(guildId);
	});

	this.on('open', function () {
		this._updateAvaMode();
	});
}
inherits(GuildsTab, WuiDom);
module.exports = GuildsTab;

function kickButton(alliance, guild, isGuildLeader) {
	var button = new Button({ className: 'kick' }, function () {
		if (guild.allianceLeader && alliance.guildCount > 1) {
			return window.gui.openSimplePopup(getText('ui.alliance.guildLeaderCantBeBanned'));
		}

		var message = isGuildLeader ?
			getText('ui.alliance.quitConfirm') :
			getText('ui.alliance.kickConfirm', guild.guildName);

		window.gui.openConfirmPopup({
			title: getText('ui.popup.warning'),
			message: message,
			cb: function (result) {
				if (!result) {
					return;
				}

				window.dofus.sendMessage('AllianceKickRequestMessage', { kickedId: guild.guildId });
			}
		});
	});
	addTooltip(button, getText('ui.alliance.kickGuild'));
	return button;
}

function makeLeaderButton(guild) {
	var button = new Button({ className: 'leader' }, function () {
		window.gui.openConfirmPopup({
			title: getText('ui.popup.warning'),
			message: getText('ui.alliance.giveLeadershipConfirm', guild.guildName),
			cb: function (result) {
				if (!result) {
					return;
				}

				window.dofus.sendMessage('AllianceChangeGuildRightsMessage', {
					guildId: guild.guildId,
					rights: AllianceRightsBitEnum.ALLIANCE_RIGHT_BOSS
				});
			}
		});
	});
	addTooltip(button, getText('ui.alliance.giveLeadership'));
	return button;
}


GuildsTab.prototype._updateAvaMode = function () {
	var playerInfo = window.gui.playerData.characterBaseInformations;
	var avaEnable = false;

	if (playerInfo.level >= 50) { // hard coded
		this.avaMode.enable();
		var aggressable = window.gui.playerData.characters.mainCharacter.characteristics.alignmentInfos.aggressable;

		avaEnable =
			aggressable === AgrStatus.AvA_ENABLED_AGGRESSABLE ||
			aggressable === AgrStatus.AvA_ENABLED_NON_AGGRESSABLE ||
			aggressable === AgrStatus.AvA_DISQUALIFIED ||
			aggressable === AgrStatus.AvA_PREQUALIFIED_AGGRESSABLE;

		var activate = this.avaMode.isActivate();
		this.avaMode.setText(activate ? getText('ui.alliance.disableAvA') : getText('ui.alliance.activateAvA'));
		if (activate !== avaEnable) {
			this.avaMode.toggleActivation(avaEnable);
		}
	} else {
		this.avaMode.disable();
	}
};

GuildsTab.prototype._createDom = function () {
	var playerData = window.gui.playerData;
	var alliance = playerData.alliance.current;
	var isLeader = playerData.alliance.isBoss();
	var playerId = playerData.id;

	function createGuildNameCell(guild) {
		var nameBox = new WuiDom('div', { className: 'nameBox' });
		var guildName = nameBox.createChild('div', { text: guild.guildName, className: 'link' });
		tapBehavior(guildName);
		guildName.on('tap', function () {
			guildManager.openGuildCard(guild.guildId);
		});

		var leader = nameBox.createChild('div');
		tapBehavior(leader);
		leader.on('tap', function () {
			window.gui.openContextualMenu('player',
				{ playerName: guild.leaderName, playerId: guild.leaderId, hasGuild: true }
			);
		});

		leader.createChild('span', { text: getText('ui.guild.leadBy', '') });
		leader.createChild('span', { text: guild.leaderName, className: 'link' });
		return nameBox;
	}

	function createGuildMemberCell(guild) {
		var memberBox = new WuiDom('div', { className: 'memberBox' });
		var connected = memberBox.createChild('div', {
			text: getText('ui.guild.onlineMembers', guild.nbConnectedMembers, guild.nbMembers)
		});

		if (guild.nbConnectedMembers === 0 && guild.lastActivity > 0) {
			var hoursSinceLastConnection = guild.getHoursSinceLastConnection();
			var months = Math.floor(hoursSinceLastConnection / 720);
			var days =  Math.floor((hoursSinceLastConnection - months * 720) / 24);

			var tooltipContent;
			if (months > 0) {
				if (days > 0) {
					tooltipContent = getText('ui.social.monthsAndDaysSinceLastConnection', months, days, days);
				} else {
					tooltipContent = getText('ui.social.monthsSinceLastConnection', months, months);
				}
			} else if (days > 0) {
				tooltipContent = getText('ui.social.daysSinceLastConnection', days, days);
			} else {
				tooltipContent = getText('ui.social.lessThanADay');
			}

			addTooltip(connected, getText('ui.social.lastConnection', tooltipContent));
		}

		memberBox.createChild('div', { text: guild.nbTaxCollectors + ' ' + getText('ui.social.guildTaxCollectors') });
		return memberBox;
	}


	function createGuildActionCell(guild) {
		var buttons;
		var isGuildLeader = guild.leaderId === playerId;
		if (isLeader) { // alliance leader
			buttons = new WuiDom('div', { className: 'buttonBox' });
			buttons.appendChild(kickButton(alliance, guild, isGuildLeader));

			if (!isGuildLeader) {
				buttons.appendChild(makeLeaderButton(guild));
			}
		} else if (isGuildLeader) { // guild leader
			buttons = new WuiDom('div', { className: 'buttonBox' });
			buttons.appendChild(kickButton(alliance, guild, true));
		} else {
			buttons = '';
		}
		return buttons;
	}

	function createEmblemLogo(guild) {
		var emblemLogo = new EmblemLogo({ width: 50, height: 50 });
		emblemLogo.setValue({ guild: guild });
		return emblemLogo;
	}

	this.table = this.appendChild(new Table(
		[
			{ id: 'emblem', format: createEmblemLogo },
			{ id: 'guildName', header: getText('ui.common.name'), format: createGuildNameCell, defaultSorter: true, sort: true },
			{ id: 'guildLevel', header: getText('ui.common.level'), sort: true },
			{ id: 'nbMembers', header: getText('ui.common.members'), format: createGuildMemberCell, sort: true },
			{ id: 'actions', format: createGuildActionCell }
		],
		'guildId',
		{ clickable: false }
	));

	// TODO handle updates on player aggressable characteristic updates
	this.avaMode = this.appendChild(new CheckboxLabel(''));
	this.avaMode.on('change', function (activate) {
		window.dofus.sendMessage('SetEnableAVARequestMessage', { enable: activate });
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/AllianceTab/GuildsTab/index.js
 ** module id = 859
 ** module chunks = 0
 **/