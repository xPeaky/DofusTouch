/*
 * This module is dedicated to unlocking the UI: when starting the game for the first time on a fresh new account,
 *  most of the UI is locked at the beginning. Some specific events are unlocking it. When an element is unlocked,
 *  it is the case for all other characters of the same account.
 */

var connectionManager = require('dofusProxy/connectionManager.js');
var beginnerAssistant = require('beginnerAssistant');
var data = require('./data.js');
var userPref = require('UserPreferences');
var hyperlink = require('hyperlink');
var getText = require('getText').getText;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Local variables */

var gui, isoEngine;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Helpers */

function returnUnavailable() {
	return false;
}

function isTutorialQuest(questId) {
	return data.tutorialQuests[questId] || false;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Data
 *  List of features that should be locked for new players, their conditions of activation
 *   and the associated beginner assistant speech
 */

var unlockableFeatures = {
	spells: {
		alreadyUnlocked: false,
		jorisDialog: 'tablet.joris.uiUnlocker.spells',
		evaluateCurrent: function () {
			return gui.playerData.characterBaseInformations.level >= 3;
		}
	},
	carac: {
		alreadyUnlocked: false,
		jorisDialog: 'tablet.joris.uiUnlocker.carac',
		evaluateCurrent: function () {
			return gui.playerData.characterBaseInformations.level >= 2;
		}
	},
	bidHouse: {
		alreadyUnlocked: false,
		jorisDialog: 'tablet.joris.uiUnlocker.bidHouse',
		evaluateCurrent: function () {
			return gui.playerData.characterBaseInformations.level >= 8;
		}
	},
	worldMap: {
		alreadyUnlocked: false,
		jorisDialog: 'tablet.joris.uiUnlocker.worldMap',
		evaluateCurrent: function () {
			var coordinates = gui.playerData.position.coordinates;
			return !gui.compass.isInTutorialCorridor(coordinates.posX, coordinates.posY);
		}
	},
	friends: {
		alreadyUnlocked: false,
		jorisDialog: 'tablet.joris.uiUnlocker.friends',
		evaluateCurrent: function () {
			return window.actorManager.getPlayers().length > 0;
		}
	},
	quests: {
		alreadyUnlocked: false,
		jorisDialog: 'tablet.joris.uiUnlocker.quests',
		evaluateCurrent: function () {
			var knownQuests = Object.keys(gui.playerData.quests.all);
			for (var i = 0; i < knownQuests.length; i++) {
				if (!isTutorialQuest(knownQuests[i])) { return true; }
			}
			return false;
		}
	},
	koliseum: {
		alreadyUnlocked: false,
		jorisDialog: null,
		evaluateCurrent: returnUnavailable
	},
	/* // we don't want to lock the market at all
	market: {
		alreadyUnlocked: false,
		jorisDialog: null,
		evaluateCurrent: returnUnavailable
	},*/
	directory: {
		alreadyUnlocked: false,
		jorisDialog: null,
		evaluateCurrent: function () {
			return unlockableFeatures.friends.alreadyUnlocked || unlockableFeatures.friends.evaluateCurrent();
		}
	},
	alignment: {
		alreadyUnlocked: false,
		jorisDialog: null,
		evaluateCurrent: returnUnavailable
	},
	bestiary: {
		alreadyUnlocked: false,
		jorisDialog: 'tablet.joris.uiUnlocker.bestiary',
		evaluateCurrent: function () {
			// Struk'toer Nhin: 172 (premieres armes)
			// Misc: 199 (les beaux arts) - 826 + objectiveId 5246/5247 (La fin du règne)
			for (var questId in gui.playerData.quests.all) {
				var nQuestId = Number(questId);
				if (nQuestId === 172 || nQuestId === 199) {
					return true;
				}
				if (nQuestId === 826) {
					var objectives = gui.playerData.quests.all[826].objectives;
					// if a quest is finished, objectives is undefined
					if (objectives === undefined) {
						if (!gui.playerData.quests.finished[826]) {
							console.error(new Error('quest 826 objectives is undefined but quest is not finished'));
						}
						return true;
					}
					for (var i = 0; i < objectives.length; i++) {
						if (objectives[i].objectiveId === 5246 || objectives[i].objectiveId === 5247) {
							return true;
						}
					}
				}
			}
			return false;
		}
	},
	ornaments: {
		alreadyUnlocked: false,
		jorisDialog: null,
		evaluateCurrent: returnUnavailable
	},
	achievements: {
		alreadyUnlocked: false,
		jorisDialog: 'tablet.joris.uiUnlocker.achievements',
		evaluateCurrent: function () {
			var achievements = gui.playerData.achievements.finishedAchievementsIds;
			for (var i = 0; i < achievements.length; i++) {
				if (achievements[i] === data.achievementsHintId) {
					return true;
				}
			}
			return false;
		}
	},
	almanax: {
		alreadyUnlocked: false,
		jorisDialog: null,
		evaluateCurrent: returnUnavailable
	},
	myShop: {
		alreadyUnlocked: false,
		jorisDialog: 'tablet.joris.uiUnlocker.myShop',
		evaluateCurrent: function (options) {
			if (options && options.init) {
				// unlike other triggers we don't want myShop to be dynamically evaluated during init
				//  (else it would everytime be activated silently during this phase)
				return unlockableFeatures.myShop.alreadyUnlocked;
			}
			var alreadyConnectedChars = userPref.getValue('beginnerUiLocked.alreadyConnectedChars', []);
			if (alreadyConnectedChars.indexOf(gui.playerData.id) !== -1) { // second connection with the same character
				userPref.delValue('beginnerUiLocked.alreadyConnectedChars'); // we don't need this data anymore. ever.
				return true;
			}
			alreadyConnectedChars.push(gui.playerData.id);
			userPref.setValue('beginnerUiLocked.alreadyConnectedChars', alreadyConnectedChars);
			return false;
		}
	},
	job: {
		alreadyUnlocked: false,
		jorisDialog: 'tablet.joris.uiUnlocker.job',
		evaluateCurrent: function () {
			return (gui.playerData.jobs && Object.keys(gui.playerData.jobs.list).length > 0);
		}
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Initialization */

// Called one time per character max, the first time the assistant is required
function initialize() {
	gui = window.gui;
	isoEngine = window.isoEngine;

	loadConfig();
	initialLock();
	if (isFullyUnlocked()) { return; }
	saveConfig();

	// Setting the listeners
	gui.playerData.on('characterInfosUpdated', onCharacterInfosUpdated);
	isoEngine.on('mapLoaded', onMapLoaded);
	connectionManager.on('GameRolePlayShowActorMessage', onGameRolePlayShowActorMessage);
	gui.playerData.quests.on('questStarted', onQuestStarted);
	gui.playerData.quests.on('questUpdate', onQuestUpdate);
	gui.on('AchievementFinishedMessage', onAchievementFinished);
	gui.uiLocker.on('updated', onUiLockerUpdate);
	gui.once('disconnect', onDisconnect);

	update('myShop');
	onMapLoaded();
}

function onCharacterInfosUpdated() {
	// as soon as character reached maximum beginner assistant level, everything is unlocked for good
	if (gui.playerData.characterBaseInformations.level > data.characterLevelLimit) {
		return deactivate();
	}
	update(['spells', 'carac', 'bidHouse']);
}

function onMapLoaded() {
	// as soon as character is leaving Incarnam, everything is unlocked for good
	if (gui.playerData.position.worldmapId !== data.INCARNAM_WORLD_MAP) {
		return deactivate();
	}
	update(['worldMap', 'friends']);
}

function onGameRolePlayShowActorMessage() { // actorManager is not an event emitter
	update(['friends', 'directory']);
}

function onQuestStarted() {
	update(['quests', 'bestiary']);
}

function onQuestUpdate() {
	update('bestiary');
}

function onAchievementFinished() {
	update('achievements');
}

function onUiLockerUpdate(options) {
	if (options.featureId === 'job') {
		update('job');
	}
}

function onDisconnect() {
	gui.playerData.removeListener('characterInfosUpdated', onCharacterInfosUpdated);
	isoEngine.removeListener('mapLoaded', onMapLoaded);
	connectionManager.removeListener('GameRolePlayShowActorMessage', onGameRolePlayShowActorMessage);
	gui.playerData.quests.removeListener('questStarted', onQuestStarted);
	gui.playerData.quests.removeListener('questUpdate', onQuestUpdate);
	gui.removeListener('AchievementFinishedMessage', onAchievementFinished);
	gui.uiLocker.removeListener('updated', onUiLockerUpdate);
	gui.removeListener('disconnect', onDisconnect);
	unlockAll(false); // false = do not save after unlocking
}

// deactivate definitively the feature for all characters
function deactivate() {
	unlockAll(true);
	onDisconnect();
}

// lock features included in unlockableFeatures, that have not been already unlocked
// and which activation condition has not been met yet
function initialLock() {
	for (var featureId in unlockableFeatures) {
		var featureData = unlockableFeatures[featureId];
		if (!featureData.alreadyUnlocked && featureData.evaluateCurrent && !featureData.evaluateCurrent({ init: true })) {
			gui.uiLocker.lockFeature(featureId, 'beginnerAssistant');
			featureData.alreadyUnlocked = false;
		} else {
			featureData.alreadyUnlocked = true;
		}
	}
}

// featuresIds can be:
//   - null: will update everything
//   - a single featureId
//   - an array of featureIds
function update(featuresIds) {
	if (featuresIds) {
		if (!(featuresIds instanceof Array)) {
			featuresIds = [featuresIds];
		}
	} else {
		featuresIds = Object.keys(unlockableFeatures);
	}
	var changed = false;
	for (var i = 0; i < featuresIds.length; i++) {
		var featureId = featuresIds[i];
		var singleChange = updateFeature(featureId, false);
		changed = changed || singleChange;
	}
	if (changed) {
		saveConfig();
	}
}

function updateFeature(featureId, save) {
	if (!beginnerAssistant.isBeginnerAssistantRequired()) { return false; }
	var featureData = unlockableFeatures[featureId];
	if (featureData.alreadyUnlocked) { return false; }
	if (!featureData.evaluateCurrent()) { return false; }
	featureData.alreadyUnlocked = true;
	gui.uiLocker.unlockFeature(featureId, 'beginnerAssistant');
	if (featureData.jorisDialog) {
		beginnerAssistant.openDialog(hyperlink.process(getText(featureData.jorisDialog)));
	}
	if (save) {
		saveConfig();
	}
	return true;
}

// called when assistant will not be required again, ever, for the current character
function removeAndClean() {
	deactivate();
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Save and load */

function getSaveKey() {
	return 'beginnerUiLocked';
}

function saveConfig() {
	var locked = {};
	for (var featureId in unlockableFeatures) {
		if (!unlockableFeatures[featureId].alreadyUnlocked) {
			locked[featureId] = 1; // not `true` to save (trivial) JSON stringification space
		}
	}
	userPref.setValue(getSaveKey(), locked);
}

function loadConfig() {
	var locked = userPref.getValue(getSaveKey(), null);
	if (locked === null) { return; } // no saved data
	for (var featureId in unlockableFeatures) {
		unlockableFeatures[featureId].alreadyUnlocked = !locked[featureId];
	}
}

function reset() {
	for (var featureId in unlockableFeatures) {
		unlockableFeatures[featureId].alreadyUnlocked = false;
	}
	initialLock();
	saveConfig();
	userPref.delValue('beginnerUiLocked.alreadyConnectedChars');
}

function unlockAll(shouldSave) {
	for (var featureId in unlockableFeatures) {
		unlockableFeatures[featureId].alreadyUnlocked = true;
		gui.uiLocker.unlockFeature(featureId, 'beginnerAssistant');
	}
	if (shouldSave) {
		saveConfig();
	}
}

function isFullyUnlocked() {
	for (var featureId in unlockableFeatures) {
		if (!unlockableFeatures[featureId].alreadyUnlocked) {
			return false;
		}
	}
	return true;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Exposing */

exports.initialize = initialize;
exports.reset = reset;
exports.unlockAll = unlockAll;
exports.removeAndClean = removeAndClean;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/beginnerAssistant/uiUnlocker.js
 ** module id = 627
 ** module chunks = 0
 **/