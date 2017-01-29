require('./styles.less');
var WuiDom = require('wuidom');
var inherits = require('util').inherits;
var Table = require('TableV2');
var getText = require('getText').getText;
var Button = require('Button');
var windowsManager = require('windowsManager');
var CheckboxLabel = require('CheckboxLabel');
var PlayerStateEnum = require('PlayerStateEnum');
var GuildRightsBitEnum = require('guildManager').GuildRightsBitEnum;
var assetPreloading = require('assetPreloading');
var AlignmentSideEnum = require('AlignmentSideEnum');
var userPref = require('UserPreferences');

var playerStateCss = {};
playerStateCss[PlayerStateEnum.NOT_CONNECTED] = 'offline';
playerStateCss[PlayerStateEnum.GAME_TYPE_ROLEPLAY] = 'online';
playerStateCss[PlayerStateEnum.GAME_TYPE_FIGHT] = 'online';
playerStateCss[PlayerStateEnum.UNKNOWN_STATE] = 'offline';

function compareName(itemA, itemB) {
	if (itemA.name < itemB.name) {
		return -1;
	} else {
		return 1;
	}
}

function compareRank(itemA, itemB) {
	if (itemA.rankValue < itemB.rankValue) {
		return -1;
	} else {
		return 1;
	}
}

function compareOnline(itemA, itemB) {
	if (itemA.onlineStatus < itemB.onlineStatus) {
		return -1;
	} else {
		return 1;
	}
}


function GuildMembersWindow(options) {
	options = options || {};

	WuiDom.call(this, 'div', { className: 'GuildMembers' });
	this.addClassNames(options.className);

	this.once('open', function () {
		this._setupDom();
		this._setupSocketEvents();
	});
}

inherits(GuildMembersWindow, WuiDom);
module.exports = GuildMembersWindow;


GuildMembersWindow.prototype._setupDom = function () {
	var self = this;

	// params for TableV2
	var tableParams = [
		{
			id: 'playerIcon',
			sort: compareOnline
		},
		{
			id: 'nameButton',
			header: getText('ui.common.name'),
			sort: compareName
		},
		{
			id: 'rankName',
			header: getText('ui.pvp.rank'),
			sort: compareRank
		},
		{
			id: 'level',
			header: getText('ui.common.short.level'),
			sort: true
		},
		{
			id: 'xpPercentage',
			header: '%' + getText('ui.common.xp'),
			sort: true
		},
		{
			id: 'xp',
			header: getText('ui.common.xp'),
			sort: true
		},
		{
			id: 'achievement',
			header: getText('ui.achievement.achievement'),
			sort: true
		},
		{
			id: 'stateIcon',
			sort: compareOnline
		},
		{
			id: 'buttons'
		}
	];
	this.table = this.appendChild(new Table(tableParams, null, { clickable: false }));

	this.table.addFilter(function (item) {
		if (self.showOfflineCheckbox.isActivate()) {
			return true;
		}
		return (item.onlineStatus === 'online');
	});

	var warnMemberOnConnectionState = window.gui.playerData.guild.current.warnMemberOnConnectionState;

	var showGuildMembersOffline = userPref.getValue('showGuildMembersOffline', false);
	this.showOfflineCheckbox = this.appendChild(
		new CheckboxLabel(getText('ui.social.displayOfflineGuildMembers'), showGuildMembersOffline)
	);
	var notifyCheckbox = this.appendChild(
		new CheckboxLabel(getText('ui.social.warnWhenGuildMembersComeOnline'), warnMemberOnConnectionState)
	);

	this.averageLevel = this.createChild('div', { className: 'averageLevel' });

	this.showOfflineCheckbox.on('change', function (result) {
		self.table.filter();
		userPref.setValue('showGuildMembersOffline', result);
	});

	notifyCheckbox.on('change', function (result) {
		window.dofus.sendMessage('GuildMemberSetWarnOnConnectionMessage', { enable: result });
		window.gui.playerData.guild.current.warnMemberOnConnectionState = result;
	});
};

GuildMembersWindow.prototype._setupSocketEvents = function () {
	var self = this;

	window.gui.playerData.guild.on('guildMember', function (members) {
		if (!self.isVisible()) {
			return;
		}
		self._updateMembersList(members);
	});

	window.gui.playerData.guild.on('guildMemberStatusUpdate', function (player) {
		if (!self.isVisible()) {
			return;
		}

		var cell = self.table.getCell(player.id, 'playerIcon');
		var onlineStatusIcon = cell.getChild('onlineStatusIcon');
		onlineStatusIcon.setClassNames('onlineStatusIcon', 'status' + player.status.statusId);
	});
};


GuildMembersWindow.prototype._updateMembersList = function (members) {
	var guild = window.gui.playerData.guild;
	var currentGuild = guild.current;
	var myPlayerId = window.gui.playerData.id;
	var alignmentModule = window.gui.playerData.alignment;
	var iAmLeader = myPlayerId === currentGuild.leaderId;
	var heads = [], headImageIds = [];
	var smileyStateIcons = [];
	var smileyImagePaths = [];

	this.table.clearContent();

	this.averageLevel.setText(getText('ui.social.guildAvgMembersLevel') + ': ' + currentGuild.averageMemberLevel);

	// Return a function that will be called on click on the member's rights button
	function rightsButtonCb() {
		windowsManager.open('guildMemberRights', this.memberInfo);
	}

	function buttonCb() {
		var id = this.memberInfo.id;

		var isAlone = Object.keys(currentGuild.members).length === 1;

		if (id === currentGuild.leaderId && !isAlone) {
			return window.gui.openSimplePopup(getText('ui.social.guildBossCantBeBann'), getText('ui.popup.warning'));
		}

		var message = myPlayerId === id ?
			getText('ui.social.doUDeleteYou') :
			getText('ui.social.doUDeleteMember', this.memberInfo.name);

		window.gui.openConfirmPopup({
			title: getText('ui.popup.warning'),
			message: message,
			cb: function (result) {
				if (!result) {
					return;
				}
				window.dofus.sendMessage('GuildKickRequestMessage', { kickedId: id });
			}
		});
	}

	var correctRights = iAmLeader ||
		guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_BOSS) ||
		guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_MANAGE_GUILD_BOOSTS) ||
		guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_MANAGE_RIGHTS) ||
		guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_MANAGE_XP_CONTRIBUTION) ||
		guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_MANAGE_RANKS);

	var leaderPower = guild.checkRight(GuildRightsBitEnum.GUILD_RIGHT_BOSS, currentGuild.members[myPlayerId].rights);
	var RankNames = window.gui.databases.RankNames;

	function tapOnName() {
		if (this.connected) {
			window.gui.openContextualMenu('player', {
				playerId: this.id,
				accountId: this.accountId,
				playerName: this.name
			});
		} else {
			window.gui.openContextualMenu('offlinePlayer', {
				playerId: this.id,
				playerName: this.name,
				hoursSinceLastConnection: this.hoursSinceLastConnection
			});
		}
	}

	function displayWings(element, side) {
		alignmentModule.getSmallWingsUrl(side, function (url) {
			if (!element.rootElement) {
				return;
			}
			element.setStyle('backgroundImage', url);
		});
	}

	for (var i = 0, len = members.length; i < len; i++) {
		var currentMember = members[i];
		var onlineStatus = playerStateCss[currentMember.connected];
		var buttons = new WuiDom('div', { className: 'buttons' });
		var isMySelf = myPlayerId === members[i].id;

		if (isMySelf || correctRights || leaderPower) {
			buttons.appendChild(new Button({ className: ['boxSizing', 'rowButton', 'rights'] }, rightsButtonCb)).memberInfo = {
				id: currentMember.id,
				name: currentMember.name,
				level: currentMember.level,
				rank: currentMember.rank,
				experienceGivenPercent: currentMember.experienceGivenPercent,
				rights: currentMember.rights
			};
		}

		if (isMySelf || iAmLeader || leaderPower || guild.hasRight(GuildRightsBitEnum.GUILD_RIGHT_BAN_MEMBERS)) {
			buttons.appendChild(new Button({ className: ['boxSizing', 'rowButton', 'deletion'] }, buttonCb)).memberInfo = {
				id: currentMember.id,
				name: currentMember.name
			};
		}

		var playerIcon = new Button({ className: 'playerIcon', scaleOnPress: false }, tapOnName);

		playerIcon.createChild('div', {
			name: 'onlineStatusIcon',
			className: ['onlineStatusIcon', 'status' + currentMember.status.statusId]
		});

		var alignmentSideElement = playerIcon.createChild('div', { className: 'alignmentSide' });
		if (currentMember.alignmentSide === AlignmentSideEnum.ALIGNMENT_ANGEL ||
			currentMember.alignmentSide === AlignmentSideEnum.ALIGNMENT_EVIL) {
			displayWings(alignmentSideElement, currentMember.alignmentSide);
		}

		heads.push(alignmentSideElement.createChild('div', { className: 'playerHead' }));
		headImageIds.push('gfx/heads/SmallHead_' + currentMember.breed + (currentMember.sex ? 1 : 0) + '.png');

		playerIcon.id = currentMember.id;
		playerIcon.name = currentMember.name;
		playerIcon.accountId = currentMember.accountId;
		playerIcon.isMySelf = isMySelf;
		playerIcon.connected = currentMember.connected;
		playerIcon.hoursSinceLastConnection = currentMember.hoursSinceLastConnection;

		var nameButton = new Button({ className: 'nameButton', text: currentMember.name, scaleOnPress: false }, tapOnName);
		nameButton.id = currentMember.id;
		nameButton.name = currentMember.name;
		nameButton.accountId = currentMember.accountId;
		nameButton.isMySelf = isMySelf;
		nameButton.connected = currentMember.connected;
		nameButton.hoursSinceLastConnection = currentMember.hoursSinceLastConnection;

		var row = {
			playerIcon: playerIcon,
			nameButton: nameButton,
			name: currentMember.name,
			rankName: RankNames[currentMember.rank].nameId,
			rankValue: currentMember.rank,
			level: currentMember.level,
			xpPercentage: currentMember.experienceGivenPercent + '%',
			xp: currentMember.givenExperience,
			achievement: currentMember.achievementPoints,
			buttons: buttons,
			onlineStatus: onlineStatus
		};

		// Fight state is not displayed in guild window
		if (onlineStatus === 'offline') {
			row.stateIcon = new WuiDom('div', { className: ['stateIcon', 'offline'] });
		} else if (currentMember.hasOwnProperty('moodSmileyId') && currentMember.moodSmileyId > 0) {
			var smileyId = currentMember.moodSmileyId;
			var smileyData = window.gui.databases.Smileys[smileyId];
			if (!smileyData) {
				console.error('Smiley ' + smileyId + ' details are not available, it could not be displayed');
			} else {
				row.stateIcon = new WuiDom('div', { className: ['stateIcon', 'smiley'] });
				smileyStateIcons.push(row.stateIcon);
				smileyImagePaths.push('gfx/smilies/' + smileyData.gfxId + '.png');
			}
		}

		// Insert the new row
		this.table.addRow(row, currentMember.id).addClassNames(onlineStatus); // Online, offline ?
	}

	this.table.filter();

	//TODO: head image will be different when there is titles or ornaments attached

	assetPreloading.preloadImages(headImageIds, function (imageUrls) {
		for (var i = 0, len = imageUrls.length; i < len; i++) {
			var head = heads[i];
			if (head && head.rootElement) {
				head.setStyle('backgroundImage', imageUrls[i]);
			}
		}
	});

	if (smileyImagePaths.length) {
		assetPreloading.preloadImages(smileyImagePaths, function (urls) {
			if (urls.length !== smileyStateIcons.length) {
				return console.error('Number of smileys preloaded does not match number of state icons');
			}
			for (var i = 0; i < urls.length; i++) {
				var smileyStateIcon = smileyStateIcons[i];
				if (smileyStateIcon && smileyStateIcon.rootElement) {
					smileyStateIcon.setStyle('backgroundImage', urls[i]);
				}
			}
		});
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/GuildWindow/GuildMembersWindow/index.js
 ** module id = 872
 ** module chunks = 0
 **/