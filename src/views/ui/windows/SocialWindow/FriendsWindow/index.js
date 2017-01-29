require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var SwipingTabs = require('SwipingTabs');
var getText = require('getText').getText;
var RegButton = require('Button');
var Button = RegButton.DofusButton;
var Table = require('Table');
var CheckboxLabel = require('CheckboxLabel');
var InputBox = require('InputBox');
var assetPreloading = require('assetPreloading');
var userPref = require('UserPreferences');

var PlayerStateEnum = require('PlayerStateEnum');
var AlignmentSideEnum = require('AlignmentSideEnum');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Friend Window */
function FriendsWindow() {
	WuiDom.call(this, 'div', { className: 'FriendsWindow', name: 'friends' });

	var self = this;

	this.ListAddFailureEnum = {
		0: getText('ui.common.unknownFail'),
		1: getText('ui.social.friend.addFailureListFull'),
		2: getText('ui.social.friend.addFailureNotFound'),
		3: getText('ui.social.friend.addFailureEgocentric'),
		4: getText('ui.social.friend.addFailureAlreadyInList')
	};

	this.tables = {};

	this.tableParams = {
		colIds: ['playerIcon', 'name', 'level', 'guild', 'achievement', 'stateIcon', 'button'],
		headerContent: [
			'',
			getText('ui.common.name'),
			getText('ui.common.level'),
			getText('ui.common.guild'),
			getText('ui.achievement.achievement')
		],
		onRowTap: function () {
			window.gui.tooltipBox.close();
		}
	};

	this.deleteTapCallback = {
		friends: function () {
			window.dofus.sendMessage('FriendDeleteRequestMessage', { accountId: this.accountId });
		},
		enemies: function () {
			window.dofus.sendMessage('IgnoredDeleteRequestMessage', { accountId: this.accountId, session: false });
		},
		ignored: function () {
			window.dofus.sendMessage('IgnoredDeleteRequestMessage', { accountId: this.accountId, session: true });
		}
	};

	this.once('open', function () {
		self._createDom();
		self._setupEvents();
		var socialData = window.gui.playerData.socialData;
		for (var player in socialData.ignoredList) {
			self.addPlayer(socialData.ignoredList[player], 'ignored');
		}
	});

	this.on('open', function (params) {
		params = params || {};
		self.tabs.openTab(params.tabId || 0);
		self.tables.friends.clearContent();
		self.tables.enemies.clearContent();
		window.dofus.sendMessage('FriendsGetListMessage');
		window.dofus.sendMessage('IgnoredGetListMessage');
	});
}

inherits(FriendsWindow, WuiDom);
module.exports = FriendsWindow;

FriendsWindow.prototype._createDom = function () {
	var tabs = this.tabs = this.appendChild(new SwipingTabs());

	this.friendsPanel = this.createChild('div', { className: ['mainPanel', 'friendsPanel'] });
	this.enemiesPanel = this.createChild('div', { className: ['mainPanel', 'enemiesPanel'] });
	this.ignoredPanel = this.createChild('div', { className: ['mainPanel', 'ignoredPanel'] });

	tabs.addTab(getText('ui.common.friends'), this.friendsPanel, 'friends');
	tabs.addTab(getText('ui.common.enemies'), this.enemiesPanel, 'enemies');
	tabs.addTab(getText('ui.common.ignoreds'), this.ignoredPanel, 'ignoreds');
	tabs.openTab(0);

	this._buildFriendsPanel();
	this._buildEnemiesPanel();
	this._buildIgnoredPanel();
};



//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method  _buildAddCharacterArea
 * @desc    Build
 *
 * @param  {WuiDom} container   - The WuiDom object to which append all the elements that are going to be created.
 *         {String} messageId
 *         {Boolean} session
 *
 * @return {Object} An object containing all the created elements. Here are the keys of the returned object:
 *                  - `addCharacterArea`
 *                  - `label`
 *                  - `textInput`
 *                  - `button`
 */

function buildAddCharacterArea(container, messageId, session) {
	var addCharacterArea = container.createChild('div', { className: 'addCharacter' });
	var label = addCharacterArea.createChild('div', { text: getText('ui.common.addSomeone'), className: 'addLabel' });
	var button = addCharacterArea.appendChild(new Button(getText('ui.common.add'), { className: 'addButton' }));
	var textInput = addCharacterArea.appendChild(new InputBox({ className: 'addInput', attr: { type: 'text' } }));

	button.on('tap', function () {
		var inputValue = textInput.rootElement.value;

		// Never send empty string !
		if (!inputValue) {
			return;
		}

		var data = { name: inputValue };

		if (session) {
			data.session = session;
		}

		window.dofus.sendMessage(messageId, data);

		// Reset the input field
		textInput.rootElement.value = '';
	});

	// Return all the created elements
	return {
		addCharacterArea: addCharacterArea,
		label: label,
		textInput: textInput,
		button: button
	};
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method  toggleDisconnectedCharactersDisplay
 * @desc    Toggle the display of the disconnected characters of a given Table object.
 *
 * @param   {Table} table
 * @param   {boolean} display Show on true, hide on false
 */
function toggleDisconnectedCharactersDisplay(table, display) {
	if (display) {
		return table.showRows();
	}

	var rowCount = table.getRowCount();
	var hideIds = [];

	for (var i = 0; i < rowCount; i++) {
		var row = table.getRow(i);

		if (!row.isConnected) {
			row.hide();
			hideIds.push(i);
		}
	}

	table.hideRows(hideIds);
}


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method  _buildFriendsPanel
 * @desc    Build the DOM elements making the friends panel.
 */
FriendsWindow.prototype._buildFriendsPanel = function () {
	var self = this;
	var friendsPanel = this.friendsPanel;

	buildAddCharacterArea(friendsPanel, 'FriendAddRequestMessage');

	this.tables.friends = friendsPanel.appendChild(new Table(this.tableParams));

	var showFriendOffline = userPref.getValue('showFriendOffline', true);
	var checkboxes = friendsPanel.createChild('div', { className: 'checkBoxes' });
	this.showFriendOfflineCheckbox = checkboxes.appendChild(
		new CheckboxLabel(getText('ui.social.showOfflinePerson'), showFriendOffline)
	);
	var friendLoginNotifyCheckbox = checkboxes.appendChild(new CheckboxLabel(
		getText('ui.social.warnWhenFriendsComeOnline'),
		window.gui.playerData.socialData.onConnectNotification
	));

	this.showFriendOfflineCheckbox.on('change', function (result) {
		toggleDisconnectedCharactersDisplay(self.tables.friends, result);
		userPref.setValue('showFriendOffline', result);
	});

	friendLoginNotifyCheckbox.on('change', function (result) {
		window.dofus.sendMessage('FriendSetWarnOnConnectionMessage', { enable: result });
	});
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method  _buildEnemiesPanel
 * @desc    Build the DOM elements making the enemies panel.
 */
FriendsWindow.prototype._buildEnemiesPanel = function () {
	var self = this;
	var enemiesPanel = this.enemiesPanel;

	buildAddCharacterArea(enemiesPanel, 'IgnoredAddRequestMessage', false);

	this.tables.enemies = enemiesPanel.appendChild(new Table(this.tableParams));

	var showEnemyOffline = userPref.getValue('showEnemyOffline', true);
	var checkboxes = enemiesPanel.createChild('div', { className: 'checkBoxes' });
	this.showEnemyOfflineCheckbox = checkboxes.appendChild(
		new CheckboxLabel(getText('ui.social.showOfflinePerson'), showEnemyOffline)
	);

	this.showEnemyOfflineCheckbox.on('change', function (result) {
		toggleDisconnectedCharactersDisplay(self.tables.enemies, result);
		userPref.setValue('showEnemyOffline', result);
	});
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method  _buildIgnoredPanel
 * @desc    Build the DOM elements making the ignored panel.
 */
FriendsWindow.prototype._buildIgnoredPanel = function () {
	buildAddCharacterArea(this.ignoredPanel, 'IgnoredAddRequestMessage', true);
	this.tables.ignored = this.ignoredPanel.appendChild(new Table(this.tableParams));
};


function loadHeadImage(player, headIcon) {
	if (!player.hasOwnProperty('breed')) {
		//TODO: remove me when it is fix
		console.error(new Error('Friends loadHeadImage: player has no breed'));
		headIcon.setStyle('backgroundImage', null);
		return;
	}
	var headImageId = 'gfx/heads/SmallHead_' + player.breed + (player.sex ? 1 : 0) + '.png';
	assetPreloading.preloadImage(headImageId, function (imageUrl) {
		headIcon.setStyle('backgroundImage', imageUrl);
	});
}

FriendsWindow.prototype._updateStateIcon = function (row, player) {
	var stateIcon = row.getChild('stateIcon').getChild('stateIcon');

	// Reset state icon
	stateIcon.delClassNames('offline', 'fight', 'smiley');
	if (stateIcon.getStyle('backgroundImage')) {
		stateIcon.setStyle('backgroundImage', '');
	}
	stateIcon.clearContent();
	stateIcon.hide();

	if (!row.isConnected) {
		stateIcon.addClassNames('offline');
		stateIcon.show();
		return;
	}

	var smileyId;
	if (player.hasOwnProperty('moodSmileyId') && player.moodSmileyId > 0) {
		smileyId = player.moodSmileyId;
		var smileyData = window.gui.databases.Smileys[smileyId];
		if (!smileyData) {
			return console.error('Smiley ' + smileyId + ' details are not available, it could not be displayed');
		}
		stateIcon.addClassNames('smiley');
		assetPreloading.preloadImage('gfx/smilies/' + smileyData.gfxId + '.png', function (url) {
			if (!stateIcon.rootElement) {
				return;
			}
			stateIcon.setStyle('backgroundImage', url);
			stateIcon.show();
		});
	}

	if (player.playerState === PlayerStateEnum.GAME_TYPE_FIGHT) {
		if (smileyId) {
			stateIcon.appendChild(new WuiDom('div', { className: 'smallFight' }));
		} else {
			stateIcon.addClassNames('fight');
			stateIcon.show();
		}
	}
};

FriendsWindow.prototype._updatePlayerRow = function (tableName, player) {
	var table = this.tables[tableName];
	var rows = table.getRows();

	for (var i = 0; i < rows.length; i++) {
		var row = rows[i];

		if (row.accountId !== player.accountId) {
			continue;
		}

		var nameDom = row.getChild('name').getChild('name');
		nameDom.setText(player.accountName + (player.playerName && player.breed ? ' (' + player.playerName + ')' : ''));
		// Code from ankama, To know if the player is connected the type need to be 'FriendOnlineInformations'
		nameDom.isConnected = player._type === 'FriendOnlineInformations';

		table.updateRow(i, {
			level: player.level || '?',
			guild: player.guildInfo ? player.guildInfo.guildName : '?',
			achievement: player.achievementPoints > 0 ? player.achievementPoints : '-'
		}, {
			isConnected: nameDom.isConnected
		});

		var playerIcon = row.getChild('playerIcon').getChild('playerIcon');
		if (player.status) {
			var onlineStatusIcon = playerIcon.getChild('onlineStatusIcon');
			onlineStatusIcon.setClassNames('onlineStatusIcon', 'status' + player.status.statusId);
		}
		playerIcon.toggleDisplay(!!row.isConnected);

		var headIcon = playerIcon.getChild('alignmentSide').getChild('headIcon');

		if (row.isConnected && !headIcon.getStyle('backgroundImage')) {
			loadHeadImage(player, headIcon);
		}

		this._updateStateIcon(row, player);
		return;
	}
};


FriendsWindow.prototype._setupEvents = function () {
	var self = this;
	var socialData = window.gui.playerData.socialData;

	// When the user gets disconnected
	window.gui.on('disconnect', function () {
		self.tables.ignored.clearContent();
	});

	socialData.on('friendUpdate', function (player) {
		self._updatePlayerRow('friends', player);
	});

	socialData.on('ignoredUpdate', function (player) {
		self._updatePlayerRow('ignored', player);
	});

	socialData.on('enemyUpdate', function (player) {
		self._updatePlayerRow('enemies', player);
	});

	socialData.on('newFriendList', function () {
		var friendsList = socialData.friendsList;

		for (var id in friendsList) {
			self.addPlayer(friendsList[id], 'friends');
		}

		var showFriendOfflineCheckbox = self.showFriendOfflineCheckbox;
		if (showFriendOfflineCheckbox.isActivate()) {
			showFriendOfflineCheckbox.activate();
		} else {
			showFriendOfflineCheckbox.deactivate();
		}
	});

	socialData.on('newEnemyList', function () {
		var enemiesList = socialData.enemiesList;

		for (var id in enemiesList) {
			self.addPlayer(enemiesList[id], 'enemies');
		}

		var showEnemyOfflineCheckbox = self.showEnemyOfflineCheckbox;
		if (showEnemyOfflineCheckbox.isActivate()) {
			showEnemyOfflineCheckbox.activate();
		} else {
			showEnemyOfflineCheckbox.deactivate();
		}
	});

	socialData.on('friendAdded', function (player) {
		self.addPlayer(player, 'friends');
	});

	socialData.on('ignoredAdded', function (player) {
		self.addPlayer(player, 'ignored');
	});

	socialData.on('enemyAdded', function (player) {
		self.addPlayer(player, 'enemies');
	});

	socialData.on('friendDeleted', function (accountId) {
		self.deletePlayer(accountId, 'friends');
	});

	socialData.on('ignoredDeleted', function (accountId) {
		self.deletePlayer(accountId, 'ignored');
	});

	socialData.on('enemyDeleted', function (accountId) {
		self.deletePlayer(accountId, 'enemies');
	});
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method  addPlayer
 * @desc    Fill up the row 'id' with 'data' in the 'table'
 *
 * @param   {object} data
 * @param   {string} tableName
 */
FriendsWindow.prototype.addPlayer = function (data, tableName) {
	var table = this.tables[tableName];
	var guildName = data.guildInfo ? data.guildInfo.guildName : '?';
	var deleteButton = new Button('', { name: 'deleteButton' });
	var alignmentModule = window.gui.playerData.alignment;

	deleteButton.on('tap', this.deleteTapCallback[tableName]);
	deleteButton.accountId = data.accountId;

	var achievementPoint = data.achievementPoints > 0 ? data.achievementPoints : '-';

	var playerIcon = new WuiDom('div', { name: 'playerIcon', className: 'playerIcon' });
	playerIcon.createChild('div', {
		name: 'onlineStatusIcon',
		className: ['onlineStatusIcon', (data.status ? 'status' + data.status.statusId : '')]
	});

	var alignmentSide = playerIcon.createChild('div', { name: 'alignmentSide', className: 'alignmentSide' });
	if (data.alignmentSide === AlignmentSideEnum.ALIGNMENT_ANGEL ||
		data.alignmentSide === AlignmentSideEnum.ALIGNMENT_EVIL) {
		alignmentModule.getSmallWingsUrl(data.alignmentSide, function (url) {
			if (!alignmentSide.rootElement) {
				return;
			}
			alignmentSide.setStyle('backgroundImage', url);
		});
	}

	var headIcon = alignmentSide.createChild('div', { className: 'playerHead', name: 'headIcon' });
	var name = new RegButton(
		{ name: 'name', text: data.accountName + (data.playerName ? ' (' + data.playerName + ')' : '') },
		function () {
			if (this.isConnected) {
				window.gui.openContextualMenu('player', {
					playerId: this.id,
					accountId: this.accountId,
					playerName: this.name
				});
			} else {
				window.gui.openContextualMenu('offlinePlayer', {
					playerId: this.id,
					playerName: this.name
				});
			}
		}
	);
	name.id = data.playerId;
	name.name = data.playerName || data.accountName;
	name.accountId = data.accountId;
	// Code from ankama, To know if the player is connected the type need to be 'FriendOnlineInformations'
	name.isConnected = data._type === 'FriendOnlineInformations';

	var row = table.addRow({
		playerIcon: playerIcon,
		name: name,
		level: data.level ? data.level : '?',
		guild: guildName,
		achievement: achievementPoint,
		stateIcon: new WuiDom('div', { name: 'stateIcon', className: 'stateIcon' }),
		button: deleteButton
	}, {
		accountId: data.accountId,
		isConnected: name.isConnected
	});

	this._updateStateIcon(row, data);

	if (!name.isConnected) {
		return;
	}

	loadHeadImage(data, headIcon);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** delete player from table */
FriendsWindow.prototype.deletePlayer = function (accountId, tableName) {
	var table = this.tables[tableName];
	var rows = table.getRows();

	accountId = parseInt(accountId, 10);

	for (var i = 0; i < rows.length; i++) {
		if (rows[i].accountId === accountId) {
			return table.delRow(i);
		}
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/FriendsWindow/index.js
 ** module id = 868
 ** module chunks = 0
 **/