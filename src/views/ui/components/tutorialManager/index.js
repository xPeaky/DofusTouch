var EventEmitter = require('events.js').EventEmitter;
var inherits = require('util').inherits;
var tutorialConstants = require('tutorialManager/tutorialConstants');
var TutorialStep = require('./tutorialStep');
var characterSelection = require('characterSelection');
var userPref = require('UserPreferences');

function TutorialManager() {
	EventEmitter.call(this);

	this.inTutorial = undefined;
	this.isChangingMap = false;
	this.inFight = false;
}
inherits(TutorialManager, EventEmitter);
module.exports = TutorialManager;


TutorialManager.prototype.initialize = function (gui) {
	var self = this;

	this.tutorialStep = new TutorialStep();

	gui.on('disconnect', function () {
		self.inTutorial = undefined;
		self.isChangingMap = false;
		self.inFight = false;
		self._removeListeners();
	});

	gui.fightManager.on('fightStart', function () {
		self.inFight = true;
	});

	gui.fightManager.on('fightEnd', function () {
		self.inFight = false;
	});

	gui.playerData.position.on('mapUpdate', function () {
		var subArea = gui.playerData.position.subArea;
		var inTutorial = subArea && subArea.id === tutorialConstants.QUEST_TUTORIAL_FIRST_SUB_AREA_ID;

		// we only emit this on state changed, from undefined on the start to true or false after
		if (self.inTutorial !== inTutorial) {
			self.inTutorial = inTutorial;
			if (self.inTutorial) {
				if (window.isoEngine.mapRenderer.map) {
					self._openTutorialStepWindow();
				} else {
					window.isoEngine.once('mapLoaded', function () {
						self._openTutorialStepWindow();
					});
				}
			} else {
				// TODO: seems not necessary if self.inTutorial === undefined
				self._closeTutorialWindows();
			}
		}

		if (self.inTutorial) {
			window.gui.textNotification.hide();
		} else {
			window.gui.textNotification.show();
		}

		self.isChangingMap = false;
	});
};

function onGameMapMovementMessage(msg) {
	window.gui.transmitMessage({
		_messageType: '_tutorialGameMapMovementMessage',
		actorId: msg.actorId,
		isInFight: true // We only receive GameMapMovementMessage while we are in fight
	});
}

TutorialManager.prototype._openTutorialStepWindow = function () {
	this._registerListeners();
	this.tutorialStep.start();
	this.emit('inTutorialStateChanged', this.inTutorial);
};

TutorialManager.prototype._closeTutorialWindows = function () {
	this._removeListeners();
	this.tutorialStep.stop();
	this.emit('inTutorialStateChanged', this.inTutorial);
};

TutorialManager.prototype._registerListeners = function () {
	window.dofus.toggleTutorialListeners(true);
	window.gui.on('GameMapMovementMessage', onGameMapMovementMessage);
};

TutorialManager.prototype._removeListeners = function () {
	window.dofus.toggleTutorialListeners(false);
	window.gui.removeListener('GameMapMovementMessage', onGameMapMovementMessage);
};

TutorialManager.prototype._hasTutorial = function () {
	var finishedQuests = window.gui.playerData.quests.finished;

	for (var id in finishedQuests) {
		var quest = finishedQuests[id];

		if (quest.questId === tutorialConstants.QUEST_TUTORIAL_ID) {
			return false;
		}
	}

	return true;
};

TutorialManager.prototype._hasValidLevel = function () {
	return window.gui.playerData.characterBaseInformations.level <= tutorialConstants.MAX_CHARACTER_LEVEL_FOR_TUTORIAL;
};

TutorialManager.prototype.isTutorialRequired = function () {
	var tutorialDone = userPref.getValue('tutorialDone');
	if (tutorialDone) { return false; }
	var characterList = characterSelection.getCharacterList();
	for (var i = 0; i < characterList.length; i++) {
		if (characterList[i].level > tutorialConstants.MAX_CHARACTER_LEVEL_FOR_TUTORIAL) {
			userPref.setValue('tutorialDone', true);
			return false;
		}
	}
	return true;
};

TutorialManager.prototype.adminCommand = function (options) {
	if (!options || options.length !== 1 || options[0] !== 'start') {
		return 'Wrong parameter, allowed parameters: start';
	}
	if (window.gui.tutorialManager.inTutorial) {
		return 'You are already in the tutorial';
	}
	window.dofus.sendMessage('GuidedModeReturnRequestMessage');
	return 'Done';
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/tutorialManager/index.js
 ** module id = 594
 ** module chunks = 0
 **/