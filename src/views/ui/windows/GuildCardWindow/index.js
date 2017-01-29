require('./styles.less');
var allianceManager = require('allianceManager');
var addTooltip = require('TooltipBox').addTooltip;
var DofusDate = require('timeManager').DofusDate;
var EmblemLogo = require('EmblemLogo');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var Table = require('Table');
var Window = require('Window');
var WuiDom = require('wuidom');
var windowsManager = require('windowsManager');
var tapBehavior = require('tapBehavior');

function GuildCardWindow() {
	Window.call(this, {
		className: 'GuildCardWindow',
		positionInfo: { top: 'c', left: 'c', width: 400, height: 380 }
	});

	this.once('open', function () {
		this._createDom();
	});

	this.on('open', function (guildFact) {
		this._setGuild(guildFact);
	});
}
inherits(GuildCardWindow, Window);

GuildCardWindow.prototype._createDom = function () {
	var description = this.windowBody.createChild('div', { className: 'description' });

	this.emblem = description.appendChild(new EmblemLogo({ width: 70, height: 70 }));

	var labelBox = description.createChild('div', { className: 'labelBox' });
	labelBox.createChild('div', {
		className: 'label',
		text: getText('ui.common.level') + getText('ui.common.colon')
	});
	labelBox.createChild('div', {
		className: 'label',
		text: getText('ui.guild.right.leader') + getText('ui.common.colon')
	});
	labelBox.createChild('div', {
		className: 'label',
		text: getText('ui.common.members') + getText('ui.common.colon')
	});
	labelBox.createChild('div', {
		className: 'label',
		text: getText('ui.common.creationDate') + getText('ui.common.colon')
	});

	var self = this;
	var valueBox = description.createChild('div', { className: 'valueBox' });
	this.level = valueBox.createChild('div', { className: 'value' });
	this.leader = valueBox.createChild('div', { className: ['value', 'link'] });
	tapBehavior(this.leader);
	this.leader.on('tap', function () {
		window.gui.openContextualMenu('player',
			{ playerName: self._leaderName, playerId: self._leaderId, hasGuild: true }
		);
	});

	this.members = valueBox.createChild('div', { className: 'value' });
	this.creationDate = valueBox.createChild('div', { className: 'value' });

	this.perceptors = this.windowBody.createChild('div', { className: 'perceptors' });

	this.memberList = this.windowBody.appendChild(new Table({
		colCount: 2,
		headerContent: [
			getText('ui.common.name'),
			getText('ui.common.level')
		]
	}));

	var alliance = this.windowBody.createChild('div', { className: 'alliance' });
	var allianceText = alliance.createChild('div', { className: 'value' });
	this.allianceLabel = allianceText.createChild('span');
	this.allianceName = allianceText.createChild('span', { className: 'link' });
	tapBehavior(allianceText);
	allianceText.on('tap', function () {
		allianceManager.openAllianceCard(self._allianceId);
	});

	this.allianceInvite = alliance.createChild('div', { className: 'inviteBtn' });
	this.allianceInviteTooltip = new WuiDom('div');
	addTooltip(this.allianceInvite, this.allianceInviteTooltip);

	this.allianceInvite.on('tap', function () {
		window.dofus.sendMessage('AllianceInvitationMessage', { targetId: self._leaderId });
	});
};

GuildCardWindow.prototype.display = function (guildFact) {
	if (this.openState) {
		this._setGuild(guildFact);
		windowsManager.focusWindow('guildCard');
	} else {
		windowsManager.open('guildCard', guildFact);
	}
};

function createMemberRow(member) {
	var name = new WuiDom('div', { text: member.name });
	tapBehavior(name);
	name.on('tap', function () {
		window.gui.openContextualMenu('player',
			{ playerName: member.name, playerId: member.id, hasGuild: true }
		);
	});

	return [name, member.level];
}

GuildCardWindow.prototype._setGuild = function (guildFact) {
	var guild = guildFact.infos;
	var members = guildFact.members;

	this.setTitle(getText('ui.common.guild') + ' - ' + guild.guildName);

	this.emblem.setValue(guild.guildEmblem, true);

	this.level.setText(guild.guildLevel);
	this.members.setText(guild.nbMembers);

	var date = new DofusDate(guildFact.creationDate).getServerDate().toString(true);
	this.creationDate.setText(date.day + ' ' + date.monthName + ' ' + date.year);

	this._leaderId = guild.leaderId;
	this._leaderName = members[0].name;
	this.leader.setText(this._leaderName);

	this.perceptors.setText(getText('ui.guild.taxcollectorsCurrentlyCollecting',
			guildFact.nbTaxCollectors,
			guildFact.nbTaxCollectors)
	);

	this.memberList.clearContent();
	for (var i = 0, len = members.length; i < len; i += 1) {
		this.memberList.addRow(createMemberRow(members[i]));
	}

	var allianceInfo = guildFact.allianceInfos;
	if (allianceInfo) {
		this.allianceLabel.setText(getText('ui.common.alliance') + getText('ui.common.colon'));
		this.allianceName.setText(allianceInfo.allianceName);
		this._allianceId = allianceInfo.allianceId;
		this.allianceInvite.hide();
	} else {
		this.allianceLabel.setText(getText('ui.alliance.noAllianceForThisGuild'));
		this.allianceName.setText('');

		var alliance = window.gui.playerData.alliance;
		this.allianceInviteTooltip.setText(getText('ui.alliance.inviteLeader', this._leaderName));
		this.allianceInvite.toggleDisplay(alliance.hasAlliance() && alliance.isBoss());
	}
};

module.exports = GuildCardWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/GuildCardWindow/index.js
 ** module id = 764
 ** module chunks = 0
 **/