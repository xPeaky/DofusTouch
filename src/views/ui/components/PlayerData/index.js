var EventEmitter = require('events.js').EventEmitter;
var helper = require('helper');
var inherits = require('util').inherits;
var PlayerLifeStatusEnum = require('PlayerLifeStatusEnum');
var GameHierarchyEnum = require('GameHierarchyEnum');
var windowsManager = require('windowsManager');
var getText = require('getText').getText;
var Aggressable = require('AggressableStatusEnum');
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var dataModules = {
	alliance: require('./AllianceData.js'),
	characters: require('./CharactersData.js'),
	emoteData: require('./EmoteData.js'),
	fightRequests: require('./FightRequestsData.js'),
	guild: require('./GuildData.js'),
	inventory: require('./Inventory.js'),
	jobs: require('./JobsData.js'),
	achievements: require('./Achievements.js'),
	position: require('./PositionData.js'),
	partyData: require('./PartyData.js'),
	quests: require('./QuestData.js'),
	socialData: require('./SocialData.js'),
	myShop: require('./MyShop.js'),
	alignment: require('./Alignment.js')
};

/**
 * @constructor
 * @classdesc Gathers the info we receive from proxy about the current character/player.
 *
 * @event PlayerData#updated Fire an event once it gets updated. The following arguments will be passsed with the event:
 *                           - `originalMessage`, which contains the original message that has triggered the update, if
 *                              any
 */
function PlayerData() {
	EventEmitter.call(this);
	var self = this;

	this.loginName = null;
	this.identification = {};
	this.characterBaseInformations = {};
	this.accountCapabilities = {};
	this.achievements = {};
	this.lifePoints = 0;
	this.maxLifePoints = 0;
	this.movementPoints = 0;
	this.actionPoints = 0;
	this.isFightLeader = false;
	this.isFighting = false;
	this.isSpectator = false;
	this.state = PlayerLifeStatusEnum.STATUS_ALIVE_AND_KICKING;
	this.experienceFactor = 0;

	for (var parameterName in dataModules) {
		var Module = dataModules[parameterName];
		this[parameterName] = new Module();
	}

	function onIdentificationSuccess(msg) {
		self.identification = {
			accountCreation: msg.accountCreation,
			accountId: msg.accountId,
			communityId: msg.communityId,
			hasRights: msg.hasRights,
			// Instead of the login (not used) the login server give the account_session_uid for haapi to start the kpi
			// session. Login is now set by this.setLoginName function
			accountSessionUid: msg.login,
			login: self.loginName,
			nickname: msg.nickname,
			secretQuestion: msg.secretQuestion,
			subscriptionEndDate: msg.subscriptionEndDate,
			wasAlreadyConnected: msg.wasAlreadyConnected
		};
	}

	window.dofus.connectionManager.on('IdentificationSuccessMessage', onIdentificationSuccess);
	window.dofus.connectionManager.on('IdentificationSuccessWithLoginTokenMessage', onIdentificationSuccess);
}
inherits(PlayerData, EventEmitter);
module.exports = PlayerData;

/** Mainly, installs the event listeners for player data related messages
 *  @param {Gui} gui - the gui root object */
PlayerData.prototype.initialize = function (gui) {
	var self = this;
	var connectionManager = window.dofus.connectionManager;

	function removeMount() {
		delete self.equippedMount;
		self.isRiding = false;
	}

	for (var parameterName in dataModules) {
		var module = this[parameterName];
		module.initialize(gui);
	}

	gui.on('connected', function (reconnectedInFight) {
		for (var parameterName in dataModules) {
			var module = self[parameterName];
			if (typeof module.connect === 'function') {
				module.connect(reconnectedInFight);
			}
		}
	});

	gui.on('disconnect', function () {
		for (var parameterName in dataModules) {
			var module = self[parameterName];
			if (module.disconnect) {
				module.disconnect();
			}
		}

		self.experienceFactor = 0;
		self.accountCapabilities = {};
		self.loginName = null;
		removeMount();
	});

	gui.on('AccountCapabilitiesMessage', function (msg) {
		/* msg.status is in enum GameHierarchyEnum:
		 *   UNAVAILABLE        -1 Information indisponible ()
		 *   PLAYER              0 Un joueur classique
		 *   MODERATOR          10 Un modérateur
		 *   GAMEMASTER_PADAWAN 20 Un aide de jeu (assistant de MJ)
		 *   GAMEMASTER         30 Maître du Jeu
		 *   ADMIN              40 Administrateur
		 */
		self.accountCapabilities = msg;
	});

	gui.on('ServerExperienceModificatorMessage', function (msg) {
		self.experienceFactor = msg.experiencePercent - 100;
	});

	gui.on('GameContextRefreshEntityLookMessage', function (msg) {
		if (msg.id !== self.id) {
			return;
		}

		self.characterBaseInformations.entityLook = msg.look;
		self.emit('lookUpdate', msg.look);
	});

	/** @event module:protocol/characterChoice.client_CharacterSelectedSuccessMessage_PlayerData */
	gui.on('CharacterSelectedSuccessMessage', function (msg) {
		var characterInfos = msg.infos;

		self.id = characterInfos.id;
		helper.storeMapAndEmit(self, self.characterBaseInformations, characterInfos, 'characterInfosUpdated');
		self.emit('characterSelectedSuccess');
		self.emit('lookUpdate', characterInfos.entityLook);
	});

	gui.on('CharacterLevelUpMessage', function (msg) {
		var previousLevel = self.characterBaseInformations.level;
		self.characterBaseInformations.level = msg.newLevel;
		self.emit('characterLevelUp', { newLevel: msg.newLevel, previousLevel: previousLevel });

		self.emit('characterInfosUpdated');
	});

	// MOUNT
	connectionManager.on('MountUnSetMessage', function () {
		if (!self.equippedMount) {
			return;
		}
		var lastMountId = self.equippedMount.id;
		removeMount();
		self.emit('unsetMount', lastMountId);
	});

	connectionManager.on('MountRidingMessage', function (msg) {
		self.isRiding = msg.isRiding;
		self.emit('mountRiding', msg.isRiding);
	});

	connectionManager.on('MountSetMessage', function (msg) {
		self.equippedMount = msg.mountData;
		self.equippedMount.mountLocation = 'equip';
		self.equippedMount.xpRatio = self.mountXpRatio;
		self.emit('setMount', msg);
	});

	/** Comes right after MountSetMessage during connection sequence */
	connectionManager.on('MountXpRatioMessage', function (msg) {
		if (!self.equippedMount) {
			return;
		}
		self.equippedMount.xpRatio = self.mountXpRatio = msg.ratio;
		self.emit('setMountRatio', msg.ratio);
	});

	gui.on('GameRolePlayPlayerLifeStatusMessage', function (msg) {
		var state = msg.state;
		self.state = state;

		if (state === PlayerLifeStatusEnum.STATUS_TOMBSTONE) {
			var confirmData = {
				title: getText('ui.login.news'),
				message: getText('ui.gameuicore.playerDied') + '\n\n' + getText('ui.gameuicore.freeSoul'),
				cb: function (result) {
					if (!result) {
						return;
					}
					window.dofus.sendMessage('GameRolePlayFreeSoulRequestMessage');
				}
			};
			windowsManager.getWindow('confirm').update(confirmData);
			windowsManager.openDialog(['confirm']);
		} else if (state === PlayerLifeStatusEnum.STATUS_PHANTOM) {
			// TODO: Open as a dialog
			window.gui.openSimplePopup(getText('ui.gameuicore.soulsWorld'), getText('ui.login.news'));
		}
	});

	gui.on('GameRolePlayGameOverMessage', function () {
		windowsManager.openDialog(['hardcoreDeath']);
	});
};

PlayerData.prototype.setLoginName = function (login) {
	if (!login) {
		return console.error(new Error('PlayerData.setLoginName: login is emtpy'));
	}
	this.loginName = login;
};

PlayerData.prototype.isAlive = function () {
	return this.state === PlayerLifeStatusEnum.STATUS_ALIVE_AND_KICKING;
};

PlayerData.prototype.isAdmin = function () {
	return this.accountCapabilities.status >= GameHierarchyEnum.ADMIN;
};

PlayerData.prototype.isModeratorOrMore = function () {
	return this.accountCapabilities.status >= GameHierarchyEnum.MODERATOR;
};

PlayerData.prototype.isSubscriber = function () {
	return this.identification.subscriptionEndDate > Date.now();
};

/**
 * @summary Tells you if your player is a transformation (item * 8169. Mutants do not have inventory limit)
 * @returns {boolean}
 */
PlayerData.prototype.isMutant = function () {
	return window.isoEngine.actorManager.userActor.data.type === 'GameRolePlayMutantInformations';
};

PlayerData.prototype.getRestrictions = function () {
	return window.isoEngine.actorManager.userActor.data.humanoidInfo.restrictions;
};

PlayerData.prototype.isPvpAggressable = function () {
	return this.alignment.alignmentInfos.aggressable === Aggressable.PvP_ENABLED_AGGRESSABLE ||
		this.alignment.alignmentInfos.aggressable === Aggressable.PvP_ENABLED_NON_AGGRESSABLE;
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @function getLevelDiff
 * @desc Determine if the level difference between the player and a target is too important
 *
 * @param {Number} targetLevel - the level of the target to compare to the player level
 *
 * @return {Number} 0 if the level difference is acceptable, -1 if the target level is too low and 1 if it's too high
 */
PlayerData.prototype.getLevelDiff = function (targetLevel) {
	var playerLevel = this.characterBaseInformations.level;
	var type;
	var levelRatio;
	if (targetLevel < playerLevel) {
		type = -1;
		levelRatio = playerLevel / targetLevel;
	} else {
		type = 1;
		levelRatio = targetLevel / playerLevel;
	}
	if (Math.abs(targetLevel - playerLevel) > 20 || levelRatio >= 1.2) {
		return type;
	}
	return 0;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/index.js
 ** module id = 517
 ** module chunks = 0
 **/