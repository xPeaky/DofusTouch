var inherits = require('util').inherits;
var EventEmitter = require('events.js').EventEmitter;
var dragManager = require('dragManager');
var hintArrowPositionHelper = require('hintArrowHelper');
var hyperlink = require('hyperlink');
var tutorialConstants = require('tutorialManager/tutorialConstants');
var windowsManager = require('windowsManager');
var TutorialPopup = require('TutorialPopup');
var analytics = require('analytics');
var adjust = require('adjust');
var userPref = require('UserPreferences');

var EQUIPMENT_FILTER_ID = 0;

// to determine if all `items` GID are in `itemGIDs`
function areItemsGIDMatching(itemGIDs, items) {
	var matchedMap = {};
	for (var id in items) {
		var objectGID = items[id].objectGID;
		if (itemGIDs.indexOf(objectGID) !== -1) {
			matchedMap[objectGID] = true;
		}
	}
	return Object.keys(matchedMap).length === itemGIDs.length;
}

function TutorialStep() {
	this.initialized = false;
	this.quest = null;
	this.currentStepId = null;
	this.currentStep = null;
	this.currentStepCount = null;
	this.currentSubStepCount = null;
	this.tutorialPopup = null;
}

inherits(TutorialStep, EventEmitter);
module.exports = TutorialStep;

TutorialStep.prototype.start = function () {
	if (!this.initialized) {
		this._setupHandlerFunctions();
		this._setupListeners();
		this.initialized = true;
	}

	// If quests are not initialized yet, we will never receive the 'questUpdate' event
	//  we are expecting after requesting the tutorial quest status. This happens often
	//  (race condition) when reconnecting in fight.
	if (window.gui.playerData.quests.initialized) {
		this._requestQuestStatus();
	} else {
		window.gui.playerData.quests.once('listUpdated', this._requestQuestStatus);
	}

	this.tutorialPopup = new TutorialPopup();
	this.tutorialPopup.open();
};

TutorialStep.prototype._requestQuestStatus = function () {
	window.dofus.sendMessage('QuestStepInfoRequestMessage', {
		questId: tutorialConstants.QUEST_TUTORIAL_ID
	});
};

TutorialStep.prototype.stop = function () {
	if (this.tutorialPopup) {
		this.tutorialPopup.close();
	}
};

TutorialStep.prototype._updateSubStep = function (subStep) {
	this.currentSubStepCount = subStep;
	analytics.logTutorialSubStep(this.currentStepCount, subStep - 1);
};

TutorialStep.prototype._setupHandlerFunctions = function () {
	var self = this;

	this.movementHandler = function (msg) {
		if (msg.actorId !== window.gui.playerData.id) {
			return;
		}

		if (self.currentStepCount === tutorialConstants.TUTORIAL_STEP_ROLEPLAY_MOVE ||
			(msg.isInFight && self.currentStepCount === tutorialConstants.TUTORIAL_STEP_FIGHT_MOVE)) {
			self._validateCurrentStep();
		}
	};

	this.itemEquippedHandler = function (item) {
		if (self.currentStepCount !== tutorialConstants.TUTORIAL_STEP_EQUIP_ITEM &&
			self.currentStepCount !== tutorialConstants.TUTORIAL_STEP_EQUIP_ALL_ITEMS) {
			return;
		}

		var itemGIDs = self.currentStepCount === tutorialConstants.TUTORIAL_STEP_EQUIP_ITEM ?
			tutorialConstants.FIRST_EQUIP_ITEMS : tutorialConstants.SECOND_EQUIP_ITEMS;

		if (item && itemGIDs.indexOf(item.objectGID) !== -1) {
			analytics.logTutorialSubStep(self.currentStepCount, 'item' + item.position);
			this.currentSubStepCount++;
		}

		if (areItemsGIDMatching(itemGIDs, window.gui.playerData.inventory.equippedItems)) {
			self._validateCurrentStep();
		}
	};

	this.fightStartingHandler = function () {
		if (self.currentStepCount === tutorialConstants.TUTORIAL_STEP_STARTING_A_FIGHT ||
			self.currentStepCount === tutorialConstants.TUTORIAL_STEP_FIND_BOSS) {
			self._validateCurrentStep();
		} else {
			self._updateHintArrow();
		}
	};

	this.fightStartHandler = function () {
		if (self.currentStepCount === tutorialConstants.TUTORIAL_STEP_FIGHT_LOCATION) {
			self._validateCurrentStep();
		} else {
			self._updateHintArrow();
		}
	};

	this.fightLocationHandler = function () {
		if (self.currentStepCount === tutorialConstants.TUTORIAL_STEP_FIGHT_LOCATION) {
			self._validateCurrentStep();
		}
	};

	this.figtTurnEndHandler = function (msg) {
		if (self.currentStepCount === tutorialConstants.TUTORIAL_STEP_FIGHT_SKIP_TURN &&
			msg.id === window.gui.playerData.id) {
			self._validateCurrentStep();
		}
	};

	this.useSpellHandler = function (msg) {
		if (self.currentStepCount === tutorialConstants.TUTORIAL_STEP_FIGHT_CAST_SPELL &&
			msg.sourceId === window.gui.playerData.id) {
			self._validateCurrentStep();
		}
	};

	function isEquipStep(stepCount) {
		return stepCount === tutorialConstants.TUTORIAL_STEP_EQUIP_ITEM ||
			stepCount === tutorialConstants.TUTORIAL_STEP_EQUIP_ALL_ITEMS;
	}

	this.npcDialogOpenedHandler = function () {
		self._updateSubStep(tutorialConstants.TUTORIAL_SUB_STEP_TALK_SHOW_RESPONSE);
		self._updateHintArrow();
	};

	this.windowOpenedHandler = function (params) {
		var id = params.id;
		var currentStepCount = self.currentStepCount;

		if (id === 'equipment' && isEquipStep(currentStepCount)) {
			self._updateSubStep(tutorialConstants.TUTORIAL_SUB_STEP_EQUIP_ITEM_SHOW_TAB);
			self._updateHintArrow();
		} else {
			self._hideArrows();
		}
	};

	this.windowClosedHandler = function () {
		self._updateHintArrow();
	};

	this.equipmentFilterHandler = function (filterId) {
		if (isEquipStep(self.currentStepCount) && self.currentSubStepCount >
			tutorialConstants.TUTORIAL_SUB_STEP_EQUIP_ITEM_SHOW_ITEM_MENU_ICON) {
			if (filterId !== EQUIPMENT_FILTER_ID) {
				self._updateSubStep(tutorialConstants.TUTORIAL_SUB_STEP_EQUIP_ITEM_SHOW_TAB);
			} else {
				self._updateSubStep(tutorialConstants.TUTORIAL_SUB_STEP_EQUIP_ITEM_SHOW_EQUIPMENT);
			}
			self._updateHintArrow();
		}
	};

	this.equippableHighlightedHandler = function (possiblePositions) {
		if (isEquipStep(self.currentStepCount) && self.currentSubStepCount) {
			// always point on the first slot
			hintArrowPositionHelper.pointToCharacterItem(possiblePositions[0]);
		}
	};

	// to know if an item has been equipped through a drag
	this.itemDragEndHandler = function (sourceElement, sourceId, sourceData) {
		if (sourceData && sourceData.source === 'equipment' &&
			isEquipStep(self.currentStepCount) && self.currentSubStepCount) {
			self._updateHintArrow();
		}
	};

	this.updateHintArrowHandler = this._updateHintArrow.bind(this);
};

TutorialStep.prototype._setupListeners = function () {
	var self = this;
	var gui = window.gui;

	gui.on('disconnect', function () {
		self.reset();
	});

	//--------------------------------------------------------------------------------------------
	// events to update the content of the window

	gui.playerData.quests.on('questUpdate', function (questId) {
		if (questId !== tutorialConstants.QUEST_TUTORIAL_ID) {
			return;
		}
		self._updateDisplay();
	});

	gui.playerData.quests.on('questFinished', function (quest) {
		var questId = quest.questId;
		if (questId !== tutorialConstants.QUEST_TUTORIAL_ID) {
			return;
		}

		// we save quickly to prevent a crash forcing the player to play the tutorial again
		userPref.setValue('tutorialDone', true, /*saveAfter=*/3);

		analytics.logTutorialStepEnd(15);
		adjust.trackTutorialCompleted();
		self._hideArrows();
	});

	// register or remove listeners based on the inTutorial state
	gui.tutorialManager.on('inTutorialStateChanged', function (inTutorial) {
		if (inTutorial) {
			self._registerInTutorialListeners();
		} else {
			self._removeInTutorialListeners();
		}
	});
};


TutorialStep.prototype._registerInTutorialListeners = function () {
	var gui = window.gui;

	//--------------------------------------------------------------------------------------------
	// All the events needed to go through the steps and sub-steps of the tutorial

	gui.on('_tutorialGameMapMovementMessage', this.movementHandler);

	gui.playerData.inventory.on('itemMoved', this.itemEquippedHandler);

	// It will not happen if we follow the flow, it can happen if we stop and continue the tutorial later
	// In this case, if we have more than one item, and when we equipped, it uses different message,
	// itemMoved is not called, we have to listen to itemAdded
	gui.playerData.inventory.on('itemAdded', this.itemEquippedHandler);

	gui.on('GameFightStartingMessage', this.fightStartingHandler);

	gui.on('_tutorialGameEntitiesDispositionMessage', this.fightLocationHandler);

	// validate the step when game fight start, even though the player did not select a fight location
	gui.on('GameFightStartMessage', this.fightStartHandler);

	gui.fightManager.on('GameFightTurnStart', this.fightStartHandler);

	gui.on('GameFightTurnEndMessage', this.figtTurnEndHandler);

	gui.on('GameActionFightSpellCastMessage', this.useSpellHandler);

	gui.on('GameActionFightCloseCombatMessage', this.useSpellHandler);
	// QuestStepInfoMessage
	gui.npcDialogUi.on('opened', this.npcDialogOpenedHandler);
	windowsManager.on('opened', this.windowOpenedHandler);
	windowsManager.on('closed', this.windowClosedHandler);

	var equipmentWindow = windowsManager.getWindow('equipment');
	equipmentWindow.on('equippableHighlighted', this.equippableHighlightedHandler);
	equipmentWindow.storageView.on('filter', this.equipmentFilterHandler);

	dragManager.on('dragEnd', this.itemDragEndHandler);

	window.isoEngine.on('mapLoaded', this.updateHintArrowHandler);
	window.gui.menuBar.on('open', this.updateHintArrowHandler);
	window.gui.menuBar.on('close', this.updateHintArrowHandler);
};

TutorialStep.prototype._removeInTutorialListeners = function () {
	var gui = window.gui;
	gui.removeListener('_tutorialGameMapMovementMessage', this.movementHandler);
	gui.playerData.inventory.removeListener('itemMoved', this.itemEquippedHandler);
	gui.playerData.inventory.removeListener('itemAdded', this.itemEquippedHandler);
	gui.removeListener('GameFightStartingMessage', this.fightStartingHandler);
	gui.removeListener('_tutorialGameEntitiesDispositionMessage', this.fightLocationHandler);
	gui.removeListener('GameFightStartMessage', this.fightStartHandler);
	gui.fightManager.removeListener('GameFightTurnStart', this.fightStartHandler);
	gui.removeListener('GameFightTurnEndMessage', this.figtTurnEndHandler);
	gui.removeListener('GameActionFightSpellCastMessage', this.useSpellHandler);
	gui.removeListener('GameActionFightCloseCombatMessage', this.useSpellHandler);
	gui.npcDialogUi.removeListener('opened', this.npcDialogOpenedHandler);
	windowsManager.removeListener('opened', this.windowOpenedHandler);
	windowsManager.removeListener('closed', this.windowClosedHandler);

	var equipmentWindow = windowsManager.getWindow('equipment');
	equipmentWindow.removeListener('equippableHighlighted', this.equippableHighlightedHandler);
	equipmentWindow.storageView.removeListener('filter', this.equipmentFilterHandler);

	dragManager.removeListener('dragEnd', this.itemDragEndHandler);

	window.isoEngine.removeListener('mapLoaded', this.updateHintArrowHandler);
	window.gui.menuBar.removeListener('open', this.updateHintArrowHandler);
	window.gui.menuBar.removeListener('close', this.updateHintArrowHandler);
};

TutorialStep.prototype._validateCurrentStep = function () {
	if (!this.currentStep) {
		return;
	}

	var questId = this.currentStep.questId;
	var objectives = this.currentStep.objectiveIds;

	for (var i = 0; i < objectives.length; i += 1) {
		window.dofus.sendMessage('QuestObjectiveValidationMessage', { questId: questId, objectiveId: objectives[i] });
	}

	this._hideArrows();
	analytics.logTutorialSubStep(this.currentStepCount, this.currentSubStepCount);
	this.currentSubStepCount = null;
};


TutorialStep.prototype._hideArrows = function () {
	window.gui.hintArrow.hideArrow();
	window.isoEngine.removeArrows();
};

TutorialStep.prototype.reset = function () {
	this.quest = null;
	this.currentStepId = null;
	this.currentStep = null;
	this.currentStepCount = null;
	this.currentSubStepCount = null;

	this.tutorialPopup.setContent('');
	this.tutorialPopup.hide();

	this._hideArrows();
	window.gui.shortcutBar.setAvailability(true);
	window.gui.timeline.fightControlButtons.setTurnReadyButtonAvailability(true);

	if (window.gui.tutorialManager.inTutorial) {
		this._removeInTutorialListeners();
	}
};

TutorialStep.prototype._shouldSkipFightLocationStep = function () {
	var fightManager = window.gui.fightManager;
	var fightStates = fightManager.FIGHT_STATES;
	return fightManager.fightState === fightStates.BATTLE &&
		this.currentStepCount === tutorialConstants.TUTORIAL_STEP_FIGHT_LOCATION;
};

TutorialStep.prototype._shouldSkipEquipItemsStep = function () {
	if (this.currentStepCount !== tutorialConstants.TUTORIAL_STEP_EQUIP_ITEM &&
		this.currentStepCount !== tutorialConstants.TUTORIAL_STEP_EQUIP_ALL_ITEMS) {
		return;
	}

	var itemGIDs = this.currentStepCount === tutorialConstants.TUTORIAL_STEP_EQUIP_ITEM ?
		tutorialConstants.FIRST_EQUIP_ITEMS : tutorialConstants.SECOND_EQUIP_ITEMS;

	return !areItemsGIDMatching(itemGIDs, window.gui.playerData.inventory.objects);
};

TutorialStep.prototype._updateDisplay = function () {
	var hasPrevious = false;
	if (this.currentStepCount) {
		analytics.logTutorialSubStep(this.currentStepCount, this.currentSubStepCount);
		analytics.logTutorialStepEnd(this.currentStepCount);
		hasPrevious = true;
	}

	var tutorialQuestId = tutorialConstants.QUEST_TUTORIAL_ID;
	var quests = window.gui.playerData.quests || {};
	var activeQuests = quests.active || {};
	var quest = activeQuests[tutorialQuestId];

	if (!quest) {
		console.error('TutorialStep: Cannot find quest data with questId: ' + tutorialQuestId);
		return;
	}

	this.quest = quest;
	this.currentStepId = quest.stepId;
	this.currentStep = quest.dbSteps[this.currentStepId];
	this.currentStepCount = quest.dbQuest.stepIds.indexOf(this.currentStepId) + 1;

	if (!hasPrevious) {
		analytics.log('F_T_U_E.Step0300_Enter_Tuto');
	}
	analytics.logTutorialStepStart(this.currentStepCount);

	// always start with 1 when _updateDisplay is called
	this._updateSubStep(1);

	// Do an extra check for TUTORIAL_STEP_FIGHT_LOCATION if the player exit and reconnect
	// to the fight and the fight already started so that we will skip the fight location step.
	// Also, if the player do not have valid items for the equip step, we will skip the step,
	// this can happened if the player destroy the item and re-enter tutorial.
	if (this._shouldSkipFightLocationStep() || this._shouldSkipEquipItemsStep()) {
		return this._validateCurrentStep();
	}

	this._handleMenuBarDisplay();

	this._updateStepDescription();
	this._updateHintArrow();
};

// To enable some icon to be clicked in the menu bar
TutorialStep.prototype._handleMenuBarDisplay = function () {
	var currentStepCount = this.currentStepCount;

	if (currentStepCount >= tutorialConstants.TUTORIAL_STEP_EQUIP_ITEM) {
		window.gui.uiLocker.unlockFeature('inventory', 'tutorial');
	}
};

TutorialStep.prototype._updateStepDescription = function () {
	this.tutorialPopup.setContent(hyperlink.process(this.currentStep.descriptionId));
};

TutorialStep.prototype._pointToMonsterCheck = function () {
	if (window.gui.playerData.isFighting) {
		return;
	}
	window.isoEngine.addArrowOnMonster(this.currentStepCount >= tutorialConstants.TUTORIAL_STEP_FIND_BOSS ?
	tutorialConstants.TUTORIAL_BOSS_MONSTER_ID : tutorialConstants.TUTORIAL_FIRST_MONSTER_ID);
};

function showChangeMapArrow() {
	window.gui.tutorialManager.isChangingMap = true;
	window.isoEngine.addArrowOnCell(tutorialConstants.TUTORIAL_STEP_CHANGE_MAP_ARROW_CELL_ID, 0, 0, 'upLeft');
}

TutorialStep.prototype._handleHintArrow = function () {
	this._hideArrows();
	window.gui.shortcutBar.setAvailability(true);
	window.gui.timeline.fightControlButtons.setTurnReadyButtonAvailability(true);

	if (!this.currentStepCount) {
		return;
	}

	switch (this.currentStepCount) {
		case tutorialConstants.TUTORIAL_STEP_ROLEPLAY_MOVE:
			window.isoEngine.addArrowOnCell(tutorialConstants.TUTORIAL_STEP_ROLEPLAY_MOVE_CELL_ID, 0, 0, 'upLeft');
			break;

		case tutorialConstants.TUTORIAL_STEP_TALK:
		case tutorialConstants.TUTORIAL_STEP_START_QUEST:
		case tutorialConstants.TUTORIAL_STEP_SUCCESS_QUEST:
			if (this.currentSubStepCount === tutorialConstants.TUTORIAL_SUB_STEP_TALK_SHOW_NPC) {
				// step 1
				window.isoEngine.addArrowOnNpc(tutorialConstants.TUTORIAL_STEP_TALK_NPC_ID);
			} else if (this.currentSubStepCount === tutorialConstants.TUTORIAL_SUB_STEP_TALK_SHOW_RESPONSE) {
				// step 2
				hintArrowPositionHelper.pointToNpcAnswer(0);
			}
			break;

		case tutorialConstants.TUTORIAL_STEP_EQUIP_ITEM:
		case tutorialConstants.TUTORIAL_STEP_EQUIP_ALL_ITEMS:
			switch (this.currentSubStepCount) {
				case tutorialConstants.TUTORIAL_SUB_STEP_EQUIP_ITEM_SHOW_ITEM_MENU_ICON:
					hintArrowPositionHelper.pointToMenuIcon('Bag');
					break;
				case tutorialConstants.TUTORIAL_SUB_STEP_EQUIP_ITEM_SHOW_TAB:
					hintArrowPositionHelper.pointToEquipFilterIcon();
					break;
				case tutorialConstants.TUTORIAL_SUB_STEP_EQUIP_ITEM_SHOW_EQUIPMENT:
					hintArrowPositionHelper.pointToStorageFirstSlotBox();
					break;
			}
			break;

		case tutorialConstants.TUTORIAL_STEP_CHANGE_MAP:
			hintArrowPositionHelper.pointToWindowCloseButton('equipment');

			if (!windowsManager.getWindow('equipment').openState) {
				showChangeMapArrow();
			}
			break;

		case tutorialConstants.TUTORIAL_STEP_STARTING_A_FIGHT:
			this._pointToMonsterCheck();
			break;

		case tutorialConstants.TUTORIAL_STEP_FIGHT_LOCATION:
			this._pointToMonsterCheck();

			if (window.foreground.tapOptions && window.foreground.tapOptions.mode === 'fightPlacement') {
				window.isoEngine.addArrowsSequence(tutorialConstants.FIGHT_LOCATION_TARGET_CELLS);
			}
			break;

		case tutorialConstants.TUTORIAL_STEP_FIGHT_MOVE:
			this._pointToMonsterCheck();

			if (window.foreground.tapOptions) {
				if (window.foreground.tapOptions.mode === 'fightPlacement') {
					hintArrowPositionHelper.pointToTimelineButton('fightReadyBtn');
				} else if (window.foreground.tapOptions.mode === 'fight') {
					// point to the cell near the monster
					var playerId = window.gui.playerData.id;
					var fightManager = window.gui.fightManager;
					var currentFighterId = fightManager.currentFighterId;
					var fighterPlayer = fightManager.getFighter(playerId);
					if (!fighterPlayer) {
						return console.error('Tutorial step fight move failed, fighter does not exist');
					}

					if (currentFighterId === playerId) {
						var moveToCellId = tutorialConstants.FIGHT_MOVE_TARGET_CELLS[fighterPlayer.data.disposition.cellId];
						window.isoEngine.addArrowOnCell(moveToCellId);
					}
					// do not allow the player to use the skill, disable the shortcutBar
					window.gui.shortcutBar.setAvailability(false);
					// do not allow player to be ready
					window.gui.timeline.fightControlButtons.setTurnReadyButtonAvailability(false);
				}
			}
			break;

		case tutorialConstants.TUTORIAL_STEP_FIGHT_CAST_SPELL:
			this._pointToMonsterCheck();

			if (window.gui.playerData.isFighting) {
				hintArrowPositionHelper.pointToFirstSkillShortcut();
			}
			break;

		case tutorialConstants.TUTORIAL_STEP_FIGHT_SKIP_TURN:
			this._pointToMonsterCheck();
			hintArrowPositionHelper.pointToTimelineButton('turnReadyBtn');
			break;

		case tutorialConstants.TUTORIAL_STEP_FIND_BOSS:
			this._pointToMonsterCheck();
			hintArrowPositionHelper.pointToWindowCloseButton('equipment');

			if (!windowsManager.getWindow('equipment').openState &&
				window.gui.playerData.position.mapId === tutorialConstants.TUTORIAL_MAP_ID_SECOND_AFTER_FIGHT) {
				showChangeMapArrow();
			}
			break;
	}
};

TutorialStep.prototype._updateHintArrow = function () {
	// add setTimeout here to make sure hintArrow is display after everything are rendered
	var self = this;
	setTimeout(function () { self._handleHintArrow(); }, 0);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/tutorialManager/tutorialStep.js
 ** module id = 596
 ** module chunks = 0
 **/