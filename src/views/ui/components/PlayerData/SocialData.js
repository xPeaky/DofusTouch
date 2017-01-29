var connectionManager = require('dofusProxy/connectionManager.js');
var getText = require('getText').getText;
var EventEmitter = require('events.js').EventEmitter;
var inherits = require('util').inherits;

function SocialData() {
	EventEmitter.call(this);

	this.friendsList = {};
	this.enemiesList = {};
	this.ignoredList = {};
	this.spouse = null;
	this.onConnectNotification = false;
}

inherits(SocialData, EventEmitter);
module.exports = SocialData;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
SocialData.prototype.connect = function () {
	window.dofus.sendMessage('FriendsGetListMessage');
	window.dofus.sendMessage('IgnoredGetListMessage');
	window.dofus.sendMessage('SpouseGetInformationsMessage');
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
SocialData.prototype.disconnect = function () {
	this.friendsList = {};
	this.enemiesList = {};
	this.ignoredList = {};
	this.spouse = null;
	this.onConnectNotification = false;
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
SocialData.prototype.initialize = function (gui) {
	var self = this;
	var listAddFailureEnum = {
		0: getText('ui.common.unknownFail'),
		1: getText('ui.social.friend.addFailureListFull'),
		2: getText('ui.social.friend.addFailureNotFound'),
		3: getText('ui.social.friend.addFailureEgocentric'),
		4: getText('ui.social.friend.addFailureAlreadyInList')
	};

	connectionManager.on('PlayerStatusUpdateMessage', function (msg) {
		if (self.friendsList[msg.accountId]) {
			self.friendsList[msg.accountId].status = msg.status;
			self.emit('friendUpdate', self.friendsList[msg.accountId]);
		}

		if (self.enemiesList[msg.accountId]) {
			self.enemiesList[msg.accountId].status = msg.status;
			self.emit('enemyUpdate', self.enemiesList[msg.accountId]);
		}

		if (self.ignoredList[msg.accountId]) {
			self.ignoredList[msg.accountId].status = msg.status;
			self.emit('ignoredUpdate', self.ignoredList[msg.accountId]);
		}
	});

	gui.on('FriendUpdateMessage', function (msg) {
		var friendUpdated = msg.friendUpdated;
		self.friendsList[friendUpdated.accountId] = friendUpdated;
		self.emit('friendUpdate', friendUpdated);
		self.emit('enemyUpdate', friendUpdated);
		self.emit('ignoredUpdate', friendUpdated);
	});

	gui.on('FriendsListMessage', function (msg) {
		var friendsList = {};

		for (var i = 0; i < msg.friendsList.length; i++) {
			friendsList[msg.friendsList[i].accountId] = msg.friendsList[i];
		}

		self.friendsList = friendsList;
		self.emit('newFriendList');
	});

	gui.on('IgnoredListMessage', function (msg) {
		var enemiesList = {};

		for (var i = 0; i < msg.ignoredList.length; i++) {
			enemiesList[msg.ignoredList[i].accountId] = msg.ignoredList[i];
		}

		self.enemiesList = enemiesList;
		self.emit('newEnemyList');
	});

	gui.on('FriendAddedMessage', function (msg) {
		self.friendsList[msg.friendAdded.accountId] = msg.friendAdded;
		self.emit('friendAdded', msg.friendAdded);
	});

	gui.on('IgnoredAddedMessage', function (msg) {
		var list = msg.session ? self.ignoredList : self.enemiesList;
		list[msg.ignoreAdded.accountId] = msg.ignoreAdded;
		self.emit(msg.session ? 'ignoredAdded' : 'enemyAdded', msg.ignoreAdded);
	});

	connectionManager.on('FriendDeleteResultMessage', function (msg) {
		if (!msg.success) {
			return;
		}

		gui.chat.logError(getText('ui.social.friend.delete'));

		for (var id in self.friendsList) {
			if (self.friendsList[id].accountName === msg.name) {
				delete self.friendsList[id];
				return self.emit('friendDeleted', id);
			}
		}
	});

	gui.on('IgnoredDeleteResultMessage', function (msg) {
		if (!msg.success) {
			return;
		}

		var list = msg.session ? self.ignoredList : self.enemiesList;

		for (var id in list) {
			if (list[id].accountName === msg.name) {
				delete list[id];
				return self.emit(msg.session ? 'ignoredDeleted' : 'enemyDeleted', id);
			}
		}
	});

	connectionManager.on('FriendAddFailureMessage', function (msg) {
		gui.chat.logError(listAddFailureEnum[msg.reason]);
	});

	connectionManager.on('IgnoredAddFailureMessage', function (msg) {
		gui.chat.logError(listAddFailureEnum[msg.reason]);
	});

	gui.on('FriendWarnOnConnectionStateMessage', function (msg) {
		self.onConnectNotification = msg.enable;
	});

	gui.on('SpouseInformationsMessage', function (msg) {
		var spouse = msg.spouse;
		self.spouse = {
			spouseAccountId: spouse.spouseAccountId,
			spouseId: spouse.spouseId,
			spouseName: spouse.spouseName,
			spouseLevel: spouse.spouseLevel,
			breed: spouse.breed,
			sex: spouse.sex,
			spouseEntityLook: spouse.spouseEntityLook,
			guildInfo: spouse.guildInfo,
			alignmentSide: spouse.alignmentSide,
			mapId: spouse.mapId,
			subAreaId: spouse.subAreaId,
			inFight: spouse.inFight,
			followSpouse: spouse.followSpouse
		};

		self.emit('spouseUpdate', self.spouse);
	});

	gui.on('SpouseStatusMessage', function (msg) {
		if (self.spouse && msg.hasSpouse === false) {
			self.spouse = null;
			self.emit('spouseLeft');
		}
	});

	gui.on('MoodSmileyUpdateMessage', function (msg) {
		var friend = self.friendsList[msg.accountId];
		if (!friend) {
			return;
		}
		friend.moodSmileyId = msg.smileyId;
		self.emit('friendUpdate', friend);
		self.emit('enemyUpdate', friend);
		self.emit('ignoredUpdate', friend);
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
SocialData.prototype.isIgnored = function (accountId) {
	return !!this.ignoredList[accountId];
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/SocialData.js
 ** module id = 543
 ** module chunks = 0
 **/