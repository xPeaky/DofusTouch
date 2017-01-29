require('./styles.less');
var Window = require('Window');
var inherits = require('util').inherits;
var getText = require('getText').getText;
var Button = require('Button').DofusButton;
var CheckboxLabel = require('CheckboxLabel');
var Selector = require('Selector');
var helper = require('helper');
var Table = require('Table');
var MinMaxSelector = require('MinMaxSelector');
var windowsManager = require('windowsManager');
var GuildRightsBitEnum = require('guildManager').GuildRightsBitEnum;

function GuildMemberRightsWindow() {
	var self = this;

	// Inherit (constructor)
	Window.call(this, {
		className: 'GuildMemberRightsWindow',
		positionInfo: { left: 'c', top: 'c', width: 450, height: 490 }
	});

	this.rightCheckboxes = [];

	this.rightNames = [
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_BOSS,
			label: getText('ui.social.guildRightsAllRights')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_MANAGE_GUILD_BOOSTS,
			label: getText('ui.social.guildRightsBoost')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_MANAGE_RIGHTS,
			label: getText('ui.social.guildRightsRights')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_INVITE_NEW_MEMBERS,
			label: getText('ui.social.guildRightsInvit')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_BAN_MEMBERS,
			label: getText('ui.social.guildRightsBann')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_MANAGE_XP_CONTRIBUTION,
			label: getText('ui.social.guildRightsPercentXP')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_MANAGE_MY_XP_CONTRIBUTION,
			label: getText('ui.social.guildRightManageOwnXP')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_MANAGE_RANKS,
			label: getText('ui.social.guildRightsRank')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_DEFENSE_PRIORITY,
			label: getText('ui.social.guildRightsPrioritizeMe')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_HIRE_TAX_COLLECTOR,
			label: getText('ui.social.guildRightsHiretax')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_COLLECT,
			label: getText('ui.social.guildRightsCollect')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_COLLECT_MY_TAX_COLLECTOR,
			label: getText('ui.social.guildRightsCollectMy')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_USE_PADDOCKS,
			label: getText('ui.social.guildRightsMountParkUse')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_ORGANIZE_PADDOCKS,
			label: getText('ui.social.guildRightsMountParkArrange')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_TAKE_OTHERS_MOUNTS_IN_PADDOCKS,
			label: getText('ui.social.guildRightsManageOtherMount')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_SET_ALLIANCE_PRISM,
			label: getText('ui.social.guildRightsSetAlliancePrism')
		},
		{
			right: GuildRightsBitEnum.GUILD_RIGHT_TALK_IN_ALLIANCE_CHAN,
			label: getText('ui.social.guildRightsTalkInAllianceChannel')
		}
	];

	this.minXpGivenPercentage = 0;
	this.maxXpGivenPercentage = 90;

	function onOpen(memberInfo) {
		self.windowTitle.setText(memberInfo.name + ' - ' + getText('ui.common.short.level') + ' ' + memberInfo.level);
		self._updateContent(memberInfo);
	}

	this.once('open', function (memberInfo) {
		var rankNames = [];
		var rankNamesMap = window.gui.databases.RankNames;
		for (var rank in rankNamesMap) { rankNames.push(rankNamesMap[rank]); }
		helper.sortObjectInArray(rankNames, 'order');
		self.rankNames = rankNames;
		self._setupDom();

		onOpen(memberInfo);
		this.on('open', onOpen);
	});
}


inherits(GuildMemberRightsWindow, Window);
module.exports = GuildMemberRightsWindow;

GuildMemberRightsWindow.prototype._updateContent = function (memberInfo) {
	var selector = this.selector;

	if (!selector) { return; }

	var rank = this.rank;
	var playerData = window.gui.playerData;
	var guild = playerData.guild;
	var isMySelf = memberInfo.id === playerData.id;
	var isLeader = memberInfo.id === guild.current.leaderId;
	var iAmLeader = playerData.id === guild.current.leaderId;
	var notMySelfNorLeader = !isMySelf && !isLeader;

	this.memberInfo = {
		memberId: memberInfo.id,
		experienceGivenPercent: memberInfo.experienceGivenPercent,
		name: memberInfo.name,
		rank: memberInfo.rank
	};

	selector.toggleOption(0, iAmLeader);

	selector.setValue(memberInfo.rank);
	rank.setText(window.gui.databases.RankNames[memberInfo.rank].nameId);
	this.xpContributionLabel.setText(memberInfo.experienceGivenPercent + '%');

	// member has boss right
	var hasBossRight = guild.checkRight(GuildRightsBitEnum.GUILD_RIGHT_BOSS, memberInfo.rights);
	var checkbox;

	// player has transmit right
	var transmitRights = guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_MANAGE_RIGHTS);

	for (var i = 0; i < this.rightNames.length; i++) {
		var rightValue = this.rightNames[i].right;
		checkbox = this.rightCheckboxes[i];

		if (!checkbox) { continue; }

		if (isLeader || hasBossRight || guild.checkRight(rightValue, memberInfo.rights)) {
			checkbox.activate();
		} else {
			checkbox.deactivate();
		}

		checkbox.disable();

		if (rightValue === GuildRightsBitEnum.GUILD_RIGHT_MANAGE_RIGHTS && !iAmLeader) { continue; }
		if (iAmLeader || transmitRights && notMySelfNorLeader && guild.hasRight(rightValue)) {
			checkbox.enable();
		}
	}

	this.setXpButton.disable();

	if (guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_MANAGE_XP_CONTRIBUTION) ||
		guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_MANAGE_MY_XP_CONTRIBUTION)) { this.setXpButton.enable(); }

	if (!isLeader && guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_MANAGE_RANKS) || hasBossRight) {
		selector.show();
		rank.hide();
		this.rankTitleText.delClassNames('noMargin');
		return;
	}

	selector.hide();
	rank.show();
	this.rankTitleText.addClassNames('noMargin');
};


GuildMemberRightsWindow.prototype._setupDom = function () {
	var self = this;
	var i, len;

	// Container
	var upperPanel = this.windowBody.createChild('div', { className: 'upperPanel' });

	// Rank
	var rankContainer = upperPanel.createChild('div', { className: 'container' });
	this.rankTitleText = rankContainer.createChild('div', { className: 'text', text: getText('ui.social.guildRank') });

	this.rank = rankContainer.createChild('div', { className: 'rank' });
	this.selector = rankContainer.appendChild(new Selector());

	var rankNames = this.rankNames;
	for (i = 0, len = rankNames.length; i < len; i += 1) {
		this.selector.addOption(rankNames[i].nameId, rankNames[i].id);
	}

	this.selector.on('change', function (value, previousValue) {
		if (parseInt(value, 10) === 1) {
			return window.gui.openConfirmPopup({
				title: getText('ui.popup.warning'),
				message: getText('ui.social.doUGiveRights', self.memberInfo.name),
				cb: function (result) {
					if (result) {
						self.memberInfo.rank = value;
						return;
					}

					self.selector.setValue(previousValue);
				}
			});
		}

		self.memberInfo.rank = value;
	});

	// XP given to the guild
	var xpToGuildContainer = upperPanel.createChild('div', { className: ['container', 'XpToGuild'] });
	xpToGuildContainer.createChild('div', { className: 'text', text: getText('ui.social.percentXpFull') });

	this.setXpButton = xpToGuildContainer.appendChild(new Button('', { className: 'setXpButton' }));
	var minMaxSelector = xpToGuildContainer.appendChild(new MinMaxSelector());

	minMaxSelector.on('confirm', function (value) {
		self.xpContributionLabel.setText(value + '%');
		self.memberInfo.experienceGivenPercent = value;
	});

	this.setXpButton.on('tap', function () {
		minMaxSelector.open({
			min: self.minXpGivenPercentage,
			max: self.maxXpGivenPercentage,
			defaultValue: parseInt(self.xpContributionLabel.getText(), 10)
		});
	});

	this.xpContributionLabel = xpToGuildContainer.createChild('div', { className: 'xpLabel', text: '0%' });

	var table = this.windowBody.appendChild(new Table({ colIds: ['name', 'checkbox'] }));

	// The list of rights
	for (var j = 0; j < this.rightNames.length; j++) {
		var rightItem = this.rightNames[j];
		var checkbox = new CheckboxLabel('');
		this.rightCheckboxes.push(checkbox);
		table.addRow({ name: rightItem.label, checkbox: checkbox });
	}

	var buttonContainer = this.windowBody.createChild('div', { className: 'buttonContainer' });
	var confirmButton = buttonContainer.appendChild(new Button(getText('ui.common.validation')));

	confirmButton.on('tap', function () {
		self.memberInfo.rights = self.getRightsMask();
		window.dofus.sendMessage('GuildChangeMemberParametersMessage', self.memberInfo);

		windowsManager.close(self.id);
	});

	this.on('close', function () {
		minMaxSelector.hide();
	});
};


GuildMemberRightsWindow.prototype.getRightsMask = function () {
	var rightsAsBin = 0;

	for (var i = 0; i < this.rightNames.length; i++) {
		var checkbox = this.rightCheckboxes[i];
		if (checkbox && checkbox.isActivate()) { rightsAsBin += this.rightNames[i].right; }
	}

	return rightsAsBin;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/GuildWindow/GuildMemberRightsWindow/index.js
 ** module id = 770
 ** module chunks = 0
 **/