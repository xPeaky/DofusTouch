/*
 * This module is handling beginner assistant discussions, texts, answers. More specifically:
 *  - The questions and answers when user is tapping on him
 *  - Automatically triggered advices in role play mode (one time only)
 *  - Automatically triggered advices (popup) in fight (one time only)
 */

var connectionManager = require('dofusProxy/connectionManager.js');
var actor = require('./actor.js');
var data = require('./data.js');
var WuiDom = require('wuidom');
var gt = require('getText');
var getText = gt.getText;
var processText = gt.processText;
var CompassTypeEnum = require('CompassTypeEnum');
var PlayerLifeStatusEnum = require('PlayerLifeStatusEnum');
var hyperlink = require('hyperlink');
var itemManager = require('itemManager');
var itemPositions = itemManager.positions;
var userPref = require('UserPreferences');
var beginnerAssistant = require('beginnerAssistant');
var TutorialPopup = require('TutorialPopup');

var foreground, gui, isoEngine, GPS;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Constants */

var MAX_HINTS = 3;

var FLAG_LIST = [
	{ key: 'numPlayersMet', type: 'int' },
	{ key: 'maxWeightHintShown', type: 'bool' },
	{ key: 'tackleHintShown', type: 'bool' },
	{ key: 'tacticalModeHintShown', type: 'bool' },
	{ key: 'creatureModeHintShown', type: 'bool' },
	{ key: 'pingHintShown', type: 'bool' },
	{ key: 'dungeonKeyHintShown', type: 'bool' },
	{ key: 'newEquipmentHintShown', type: 'bool' }
];

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Local variables */

var speechBubble; // SpeechBubble instance for sentences where a user input is not required
var messageContent; // current dialog content (string or WuiDom)
var buttonContents; // current dialog buttons' data (content and callback)
var dialogCloseCb; // called if current dialog is closed without answering
var nextDialogTimeoutId = null; // identifier for timeout between two completly different dialogs
var questFlag; // to store information related to hints flags
var dialogStack = []; // to be able to stack multiple messages
var hasMetPlayerOnCurrentMap = false; // if a human player has already been met on current map
var flags = {}; // current state of each flag

var tutorialPopup;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Initialization */

// Called one time per character max, the first time the assistant is required
function initialize() {
	foreground = window.foreground;
	gui = window.gui;
	isoEngine = window.isoEngine;
	GPS = gui.GPS;

	for (var i = 0; i < FLAG_LIST.length; i++) {
		var key = FLAG_LIST[i].key;
		var type = FLAG_LIST[i].type;
		flags[key] = userPref.getValue(gui.playerData.id + '-' + key, 0);
		if (type === 'bool') {
			flags[key] = !!flags[key];
		}
	}

	setListeners();
	onMapLoaded();
}

// used only by admin command
function reset() {
	for (var i = 0; i < FLAG_LIST.length; i++) {
		var key = FLAG_LIST[i].key;
		userPref.setValue(gui.playerData.id + '-' + key, 0);
	}
}

function setListeners() {
	actor.on('removed', onActorRemoved);
	isoEngine.on('mapLoaded', onMapLoaded);
	connectionManager.on('GameRolePlayShowActorMessage', onGameRolePlayShowActorMessage);
	gui.playerData.on('characterInfosUpdated', onCharacterInfosUpdated);
	gui.playerData.inventory.on('weightUpdated', onWeightUpdated);
	gui.on('GameActionFightTackledMessage', onTackle);
	isoEngine.on('GameFightEndMessage', onGameFightEndMessage);
	isoEngine.on('GameFightStartMessage', onGameFightStart);

	gui.once('disconnect', onDisconnect);
}

function onDisconnect() {
	actor.removeListener('removed', onActorRemoved);
	isoEngine.removeListener('mapLoaded', onMapLoaded);
	connectionManager.removeListener('GameRolePlayShowActorMessage', onGameRolePlayShowActorMessage);
	gui.playerData.removeListener('characterInfosUpdated', onCharacterInfosUpdated);
	gui.playerData.inventory.removeListener('weightUpdated', onWeightUpdated);
	gui.removeListener('GameActionFightTackledMessage', onTackle);
	isoEngine.removeListener('GameFightEndMessage', onGameFightEndMessage);
	isoEngine.removeListener('GameFightStartMessage', onGameFightStart);

	gui.removeListener('QuestStartedMessage', onQuestStarted);
	gui.removeListener('CompassResetMessage', resetQuestFlag);

	removePopup();
}

function onActorRemoved() {
	dialogStack = [];
	if (nextDialogTimeoutId !== null) {
		clearTimeout(nextDialogTimeoutId);
		nextDialogTimeoutId = null;
	}
	closeDialog();
}

function onMapLoaded() {
	if (!beginnerAssistant.isBeginnerAssistantRequired()) { return; }
	hasMetPlayerOnCurrentMap = false;
	checkOtherPlayers();
	checkMaxWeight();
	checkIncarnamDungeonMapId();
	checkGoodBye();
}

function onGameRolePlayShowActorMessage() {
	if (!beginnerAssistant.isBeginnerAssistantRequired()) { return; }
	checkOtherPlayers();
}

function onCharacterInfosUpdated() {
	if (!beginnerAssistant.isBeginnerAssistantRequired()) { return; }
	checkDungeonKeyHint();
	checkGoodBye();
}

function onWeightUpdated() {
	if (!beginnerAssistant.isBeginnerAssistantRequired()) { return; }
	checkMaxWeight();
}

function onTackle(msg) {
	if (flags.tackleHintShown) { return; }
	if (!beginnerAssistant.isBeginnerAssistantRequired({ fightContextAllowed: true })) { return; }
	if (msg.sourceId !== gui.playerData.id) { return; }
	var success = tryOpenPopup(getText('tablet.joris.fight.tackle'));
	if (!success) { return; }
	flags.tackleHintShown = true;
	userPref.setValue(gui.playerData.id + '-tackleHintShown', 1);
}

function onGameFightEndMessage(msg) {
	removePopup();
	if (!beginnerAssistant.isBeginnerAssistantRequired({ fightContextAllowed: true })) { return; }
	checkNewEquipment(msg);
}

function checkNewEquipment(msg) {
	if (flags.newEquipmentHintShown) { return; }
	if (gui.uiLocker.isFeatureLocked('inventory')) { return; }
	if (!msg.results || msg.results.length === 0) { return; }

	var inventory = window.gui.playerData.inventory;
	var triggeringItem = null;

	for (var i = 0; i < msg.results.length; i++) {
		var result = msg.results[i];
		if (result._type !== 'FightResultPlayerListEntry') { continue; }
		if (result.id !== gui.playerData.id) { continue; }
		if (!result.rewards || !result.rewards.objects || result.rewards.objects.length === 0) { continue; }
		for (var f = 0; f < result.rewards.objects.length; f += 2) { // (each item id is followed by a quantity)
			var itemId = result.rewards.objects[f];
			// if this item is not part of the triggering list
			if (data.newEquipmentHintsId.indexOf(itemId) === -1) { continue; }
			// if this item was not, by any chance, already owned and equipped
			if (inventory.isGenericItemEquipped(itemId)) { continue; }
			triggeringItem = itemId;
			break;
		}
		if (triggeringItem) { break; }
	}
	if (!triggeringItem) { return; }

	itemManager.getItems([triggeringItem], function (error) {
		if (error) {
			return console.error(error);
		}
		var itemData = itemManager.items[triggeringItem];
		var objectName = itemData.nameId;
		openDialog(hyperlink.process(getText('tablet.joris.newEquipment', '(' + objectName + ')')));
		flags.newEquipmentHintShown = true;
		userPref.setValue(gui.playerData.id + '-newEquipmentHintShown', 1);
	});
}

function onGameFightStart() {
	checkCreatureModeHint();
	checkTacticalModeHint();
	checkPingModeHint();
}

function checkTacticalModeHint() {
	if (flags.tacticalModeHintShown) { return; }
	if (!beginnerAssistant.isBeginnerAssistantRequired({ fightContextAllowed: true })) { return; }
	if (data.noTacticalModeMaps.indexOf(gui.playerData.position.mapId) !== -1) { return; }
	var success = tryOpenPopup(getText('tablet.joris.fight.tactical'));
	if (!success) { return; }
	flags.tacticalModeHintShown = true;
	userPref.setValue(gui.playerData.id + '-tacticalModeHintShown', 1);
}

function checkCreatureModeHint() {
	if (flags.creatureModeHintShown) { return; }
	if (!beginnerAssistant.isBeginnerAssistantRequired({ fightContextAllowed: true })) { return; }

	var triggeringMonster = false;
	for (var actorId in window.actorManager.actors) {
		var actor = window.actorManager.actors[actorId];
		if (actor.data && data.creatureModeHintCreaturesId.indexOf(actor.data.creatureGenericId) !== -1) {
			triggeringMonster = true;
			break;
		}
	}
	if (!triggeringMonster) { return; }

	var success = tryOpenPopup(getText('tablet.joris.fight.creatureMode'));
	if (!success) { return; }
	flags.creatureModeHintShown = true;
	userPref.setValue(gui.playerData.id + '-creatureModeHintShown', 1);
}

function checkPingModeHint() {
	if (flags.pingHintShown) { return; }
	if (!beginnerAssistant.isBeginnerAssistantRequired({ fightContextAllowed: true })) { return; }

	var hasHumanAlly = false;
	var playerFighter = gui.fightManager.getFighter(gui.playerData.id);
	if (!playerFighter || !playerFighter.data || isNaN(playerFighter.data.teamId)) { return; }
	var teamId = playerFighter.data.teamId;
	var fighters = gui.fightManager.getAvailableFighters();
	for (var fighterId in fighters) {
		if (Number(fighterId) === gui.playerData.id) { continue; } // self
		if (Number(fighterId) < 0) { continue; } // not human
		var fighter = fighters[fighterId];
		if (fighter && fighter.data && fighter.data.teamId === teamId) { // same team
			hasHumanAlly = true;
			break;
		}
	}
	if (!hasHumanAlly) { return; }

	var success = tryOpenPopup(getText('tablet.joris.fight.ping'));
	if (!success) { return; }
	flags.pingHintShown = true;
	userPref.setValue(gui.playerData.id + '-pingHintShown', 1);
}

function checkDungeonKeyHint() {
	// if dungeon key hint has not already been displayed
	if (flags.dungeonKeyHintShown) { return; }
	// if assistant is required
	if (!beginnerAssistant.isBeginnerAssistantRequired()) { return; }
	// if key is owned
	if (!gui.playerData.inventory.quantityList[data.incarnamDungeon.keyId]) { return; }
	// if required level has been reached
	if (gui.playerData.characterBaseInformations.level < data.incarnamDungeon.playerLevelThreshold) { return; }

	// open dialog, show direction, etc.
	openDialog(hyperlink.process(getText('tablet.joris.dungeonKey')));
	addQuestFlag(data.incarnamDungeon.coord.x, data.incarnamDungeon.coord.y, null, data.incarnamDungeon.firstMapId);
	flags.dungeonKeyHintShown = true;
	userPref.setValue(gui.playerData.id + '-dungeonKeyHintShown', 1);
}

function checkOtherPlayers() {
	if (gui.playerData.characterBaseInformations.level < data.minLevelForGuildHint) { return; }
	if (flags.numPlayersMet >= data.numPlayersMetForGuildHint) { return; }
	if (window.actorManager.getPlayers().length === 0) { return; }
	if (hasMetPlayerOnCurrentMap) { return; }
	flags.numPlayersMet++;
	hasMetPlayerOnCurrentMap = true;
	userPref.setValue(gui.playerData.id + '-numPlayersMet', flags.numPlayersMet);
	if (flags.numPlayersMet < data.numPlayersMetForGuildHint) { return; }
	openDialog(getGuildHint());
}

function checkMaxWeight() {
	if (flags.maxWeightHintShown) { return; }
	var inventory = window.gui.playerData.inventory;
	if (inventory.weight < inventory.maxWeight) { return; }
	openDialog(hyperlink.process(getText('tablet.joris.maxWeight')));
	flags.maxWeightHintShown = true;
	userPref.setValue(gui.playerData.id + '-maxWeightHintShown', 1);
}

function checkGoodBye() {
	if (
		gui.playerData.characterBaseInformations.level > data.characterLevelLimit ||
		gui.playerData.position.worldmapId !== data.INCARNAM_WORLD_MAP
	) {
		goodBye();
	}
}

// called when assistant will not be required again, ever, for the current character
function removeAndClean() {
	onDisconnect();
	for (var i = 0; i < FLAG_LIST.length; i++) {
		var key = FLAG_LIST[i].key;
		userPref.delValue(gui.playerData.id + '-' + key);
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Dialog window preparation */

function openDialog(content, buttons, closeCb) {
	function retry() {
		openDialog(content, buttons, closeCb);
	}

	// an interactive dialog is already in progress, let's retry when it will be closed
	if (gui.npcDialogUi.inDialog) {
		// if the dialog is already a beginner assistant one, we just push the new one in the queue
		if (gui.npcDialogUi.actor && gui.npcDialogUi.actor.actorId === 'beginnerAssistant') {
			if (!content) { return; } // we don't stack default user initiated dialog
			return dialogStack.push({ content: content, buttons: buttons, closeCb: closeCb });
		}
		// else we are listening for the dialog to close until retrying
		return gui.npcDialogUi.once('closed', retry);
	}

	// beginner assistant already has a simple speech bubble opened
	if (speechBubble) {
		if (!content) { return; } // we don't stack default user initiated dialog
		return dialogStack.push({ content: content, buttons: buttons, closeCb: closeCb });
	}

	// if actor is not loaded yet, let's wait for him
	var sprite = actor.getActor();
	if (!sprite) {
		return actor.once('actorReady', retry);
	}

	messageContent = null;
	buttonContents = buttons || [];
	dialogCloseCb = closeCb || null;

	// wait for beginner assistant to stop if he's moving
	if (sprite.moving) {
		return actor.once('actorStopped', retry);
	}

	// prevent him to move while talking
	actor.freeze();

	if (!content) {
		prepareContent();
	} else {
		addMessage(content);
	}

	openCurrent();
}

function openCurrent() {
	// if no user interaction is required we open a simple bubble
	if (!buttonContents || buttonContents.length === 0) {
		speechBubble = gui.newSpeechBubble({
			title: getText('tablet.joris'),
			msg: messageContent,
			actor: actor.getActor(),
			onClose: function () {
				if (dialogCloseCb) {
					return dialogCloseCb();
				}
				onClose();
			},
			isLocked: true,
			action: function () {
				speechBubble.close();
			}
		});
		foreground.unlock('beginnerAssistantDialog');
		return;
	}

	foreground.lock('beginnerAssistantDialog');

	var buttonsCaption = [];
	for (var i = 0; i < buttonContents.length; i++) {
		buttonsCaption.push(buttonContents[i].buttonText);
	}

	gui.npcDialogUi.showNpcQuestion(messageContent, buttonsCaption, function replyHandler(repId) {
		var cb;
		if (repId !== null && buttonContents[repId].callback) { // if selected answer has a callback
			cb = buttonContents[repId].callback;
		} else if (repId === null && dialogCloseCb) { // if closed without answering and there is a close callback
			cb = dialogCloseCb;
			gui.npcDialogUi.leaveDialog();
		}
		if (cb) {
			messageContent = null;
			buttonContents = [];
			dialogCloseCb = null;
			return cb();
		}
		// default: closing
		gui.npcDialogUi.leaveDialog();
		onClose();
	}, {
		actor: actor.getActor(),
		npcData: {
			nameId: getText('tablet.joris')
		}
	});
}

function onClose() {
	speechBubble = null;
	messageContent = null;
	dialogCloseCb = null;
	buttonContents = [];
	if (dialogStack.length > 0) {
		nextDialogTimeoutId = setTimeout(function () {
			nextDialogTimeoutId = null;
			var data = dialogStack.shift();
			openDialog(data.content, data.buttons, data.closeCb);
		}, 500);
		return;
	}
	foreground.unlock('beginnerAssistantDialog');
	actor.unfreeze(2000);
}

function closeDialog() {
	if (speechBubble) {
		speechBubble.close();
	}
	if (gui.npcDialogUi.inDialog) {
		gui.npcDialogUi.leaveDialog();
		onClose();
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Dialog preparation */

function prepareContent() {
	var i;

	// identify all the hints that we can propose to the player
	var hints = [];
	if (data.exits[gui.playerData.position.mapId]) {
		hints.push({ type: 'exit', priority: 10 });
	}
	if (hasQuestsHints()) {
		hints.push({ type: 'nextQuest', priority: 8 });
	}
	if (gui.playerData.state === PlayerLifeStatusEnum.STATUS_PHANTOM) {
		hints.push({ type: 'ghost', priority: 20 });
	}
	if (Object.keys(gui.playerData.achievements.rewardableAchievements).length >= data.rewardsPendingHintLimit) {
		hints.push({ type: 'rewards', priority: 3 });
	}
	if (hasBeginnerHatHint()) {
		hints.push({ type: 'beginnerHat', priority: 5 });
	}
	if (hasGuildHint()) {
		hints.push({ type: 'guild', priority: 2 });
	}

	// sort them by priority
	hints.sort(hintSorter);

	// if we have nothing to propose
	if (hints.length === 0) {
		addMessage(getText('tablet.joris.noHint'));
		addOkButton();
		return;
	}

	addMessage(getText('tablet.joris.canIHelp'));

	for (i = 0; i < hints.length; i++) {
		if (i >= MAX_HINTS) { break; }
		if (hints[i].type === 'exit') {
			addButton(getExitHintButtonData());
		} else if (hints[i].type === 'nextQuest') {
			addButton(getNextQuestHintButtonData());
		} else if (hints[i].type === 'ghost') {
			addButton(getGhostHintButtonData());
		} else if (hints[i].type === 'rewards') {
			addButton(getRewardsHintButtonData());
		} else if (hints[i].type === 'beginnerHat') {
			addButton(getBeginnerHatButtonData());
		} else if (hints[i].type === 'guild') {
			addButton(getGuildHintData());
		}
	}
}

function hintSorter(a, b) {
	return b.priority - a.priority;
}

function addMessage(message) {
	var messageDom = new WuiDom('div', { className: 'message' });
	if (message instanceof WuiDom) {
		messageDom.appendChild(message);
	} else {
		messageDom.setHtml(message);
	}
	messageContent = messageDom;
}

function addButton(buttonData) {
	if (!buttonData) {
		return console.warn('beginnerAssistant.addButton: invalid buttonData');
	}
	buttonContents.push(buttonData);
}

function addOkButton(cb) {
	addButton({
		buttonText: 'Ok',
		callback: cb || closeDialog
	});
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Hint: exit */

function getExitHintButtonData() {
	var hasSun = false;
	var hasInteractive = false;

	var exits = data.exits[gui.playerData.position.mapId];
	if (exits && exits.length) {
		for (var i = 0; i < exits.length; i++) {
			var exit = exits[i];
			if (exit.type === 'sun') { hasSun = true; } else
			if (exit.type === 'interactive') { hasInteractive = true; }
		}
	}

	var explanation;

	if (hasSun && !hasInteractive) {
		explanation = getText('tablet.joris.exitSun');
	} else if (!hasSun && hasInteractive) {
		explanation = getText('tablet.joris.exitInteractive');
	} else {
		explanation = getText('tablet.joris.exits');
	}

	return {
		buttonText: getText('tablet.joris.searchingExit'),
		callback: function () {
			addMessage(explanation);
			addOkButton(function () {
				showExits();
				closeDialog();
			});
			openCurrent();
		}
	};
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Hint: next quest */

function getNextQuestHintButtonData() {
	var questsIdsHints = getQuestsIdsHints();
	if (questsIdsHints.length === 0) { return null; }
	return {
		buttonText: getText('tablet.joris.whatToDo'),
		callback: function () {
			getQuestsHints(questsIdsHints);
			openCurrent();
		}
	};
}

function hintsIdSorter(hintId1, hintId2) {
	return data.questsHints[hintId2].priority - data.questsHints[hintId1].priority;
}

function addHintDataButton(hintData) {
	addButton({
		buttonText: getText(hintData.question),
		callback: function () {
			getQuestHintAnswer(hintData);
			openCurrent();
		}
	});
}

function getQuestsHints(questsIdsHints) {
	if (questsIdsHints.length === 1) {
		return getQuestHintAnswer(data.questsHints[questsIdsHints[0]]);
	}
	questsIdsHints.sort(hintsIdSorter);
	for (var i = 0; i < questsIdsHints.length; i++) {
		var hintData = data.questsHints[questsIdsHints[i]];
		addHintDataButton(hintData);
	}
}

function getQuestHintAnswer(hintData) {
	addMessage(getText(hintData.answer));
	addButton({
		buttonText: getText('tablet.joris.yesPlease'),
		callback: function () {
			var playerPos = gui.playerData.position.coordinates;
			if (hintData.coordinate.x === playerPos.posX && hintData.coordinate.y === playerPos.posY) {
				addMessage(getText('tablet.joris.onTheMap'));
				addButton({
					buttonText: getText('ui.common.ok'),
					callback: closeDialog
				});
				openCurrent();
				return;
			}
			addQuestFlag(hintData.coordinate.x, hintData.coordinate.y, hintData.questId);
			closeDialog();
		}
	});
	addButton({
		buttonText: getText('tablet.joris.noThanks'),
		callback: closeDialog
	});
}

function hasQuestsHints() {
	return getQuestsIdsHints().length > 0;
}

function getQuestsIdsHints() {
	var quests = gui.playerData.quests;
	var validHints = [];
	for (var questId in data.questsHints) {
		if (quests.all[questId]) { continue; } // quest has already been started by player
		var hint = data.questsHints[questId];
		var requirementsFulfilled = true;
		if (hint.requirements && hint.requirements.length > 0) {
			for (var i = 0; i < hint.requirements.length; i++) {
				if (!quests.finished[hint.requirements[i]]) {
					requirementsFulfilled = false;
					break;
				}
			}
		}
		if (!requirementsFulfilled) { continue; }
		validHints.push(questId);
	}
	return validHints;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Hint: ghost */

function getGhostHintButtonData() {
	return {
		buttonText: getText('tablet.joris.ghostQuestion'),
		callback: function () {
			var phoenix = data.phoenixPosition;
			addMessage(hyperlink.process(getText('tablet.joris.ghostAnswer', phoenix.x, phoenix.y)));
			addButton({
				buttonText: getText('ui.common.ok'),
				callback: closeDialog
			});
			openCurrent();
		}
	};
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Hint: rewards */

function getRewardsHintButtonData() {
	return {
		buttonText: getText('tablet.joris.rewardsQuestion'),
		callback: function () {
			addMessage(getText('tablet.joris.rewardsAnswer'));
			addButton({
				buttonText: getText('ui.common.ok'),
				callback: closeDialog
			});
			openCurrent();
		}
	};
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Hint: beginner hat */

function hasBeginnerHatHint() {
	var inventory = gui.playerData.inventory;
	if (inventory.getGenericItemCount(data.beginnerHatGID) === 0) { return; }
	if (inventory.isGenericItemEquipped(data.beginnerHatGID)) { return; }
	if (inventory.equippedItems[itemPositions.hat]) { return; }
	return true;
}

function getBeginnerHatButtonData() {
	return {
		buttonText: getText('tablet.joris.beginnerHatQuestion'),
		callback: function () {
			addMessage(hyperlink.process(getText('tablet.joris.beginnerHatAnswer')));
			addButton({
				buttonText: getText('ui.common.ok'),
				callback: closeDialog
			});
			openCurrent();
		}
	};
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Hint: guild */

function hasGuildHint() {
	return (!gui.playerData.guild.hasGuild() && flags.numPlayersMet >= 2);
}

function getGuildHintData() {
	return {
		buttonText: getText('tablet.joris.guildQuestion'),
		callback: function () {
			addMessage(getGuildHint());
			addButton({
				buttonText: getText('ui.common.ok'),
				callback: closeDialog
			});
			openCurrent();
		}
	};
}

function getGuildHint() {
	var msg = getText('tablet.joris.guildAnswer');

	var guildData = data.noobGuildData[gui.serversData.connectedServerId];
	if (!guildData) {
		console.error(new Error('beginnerAssistant: no noob guild data'));
	}
	if (!guildData || guildData.noGuildData) {
		return getText('tablet.joris.guildAnswerFailover');
	}

	if (guildData instanceof Array) {
		guildData = guildData[Math.floor(Math.random() * guildData.length)];
	}

	var playersString = '';
	for (var i = 0; i < guildData.leaders.length; i++) {
		if (i === (guildData.leaders.length - 1) && i > 0) {
			playersString += getText('tablet.joris.guildAnswerOr');
		} else if (i > 0) {
			playersString += ', ';
		}
		playersString += '{player,' + guildData.leaders[i].name + ',' + guildData.leaders[i].id + '}';
	}

	msg = processText(msg, guildData.guildId, guildData.guildName, playersString);
	msg = hyperlink.process(msg);
	return msg;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Good bye */

function goodBye() {
	var sprite = actor.getActor();
	if (!sprite) {
		return actor.once('actorReady', goodBye);
	}
	var code, reason;
	if (gui.playerData.characterBaseInformations.level > data.characterLevelLimit) {
		code = 'tablet.joris.goodByeMaxLevel';
		reason = 'maxLevel';
	} else if (gui.playerData.position.worldmapId !== data.INCARNAM_WORLD_MAP) {
		code = 'tablet.joris.goodByeIncarnam';
		reason = 'incarnamLeft';
	} else {
		return console.error(new Error('beginnerAssistant: no reason to say good bye'));
	}
	var direction = sprite.direction;
	if (direction !== 3 && direction !== 1) { // only directions supported by Joris animations
		direction = Math.random() < 0.5 ? 3 : 1;
	}
	beginnerAssistant.setRequired(false);

	var cb = function () {
		gui.npcDialogUi.leaveDialog();
		setTimeout(function () { // just to `feel` better: triggering the anim right after button is pressed is strange
			dialogStack = []; // to be sure no other dialog will trigger after the onClose
			onClose();
			actor.freeze(); // previous onClose() unfroze him
			actor.setAnimation('JumpAndSmoke', direction, function () {
				actor.getActor().remove();
				if (reason === 'maxLevel') { // assistant cannot come back during this play session
					beginnerAssistant.removeAndClean();
				}
			});
		}, 300);
	};

	openDialog(
		getText(code),
		[{
			buttonText: getText('tablet.joris.goodBye'),
			callback: cb // button callback
		}],
		cb // close callback
	);
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Popup speech related */

function tryOpenPopup(content) {
	if (tutorialPopup && tutorialPopup.isVisible()) {
		return false;
	}
	if (!tutorialPopup) {
		tutorialPopup = new TutorialPopup();
		tutorialPopup.allowDomEvents();
		tutorialPopup.on('dom.touchstart', closePopup);
		tutorialPopup.open();
	}
	if (typeof content === 'string') {
		var wuiDom = new WuiDom('span');
		wuiDom.setHtml(content);
		content = wuiDom;
	}
	tutorialPopup.setContent(content);
	return true;
}

function closePopup() {
	if (!tutorialPopup) { return; }
	tutorialPopup.close();
}

function removePopup() {
	if (!tutorialPopup) { return; }
	closePopup();
	tutorialPopup.removeListener('dom.touchstart', closePopup);
	tutorialPopup.destroy();
	tutorialPopup = null;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Helpers */

function showExits() {
	isoEngine.removeArrows();
	var exitMap = data.exits[gui.playerData.position.mapId];
	if (!exitMap || !exitMap.length) { return; }
	for (var i = 0; i < exitMap.length; i++) {
		var exit = exitMap[i];
		var delta = exit.delta || { x: 0, y: 0 };
		if (exit.target === 'tile') {
			isoEngine.addArrowOnCell(exit.targetId, delta.x, delta.y, undefined, 5);
		} else if (exit.target === 'interactive') {
			var graphic = isoEngine.mapRenderer.identifiedElements[exit.targetId];
			isoEngine.addArrowOnGraphic(graphic, delta.x, delta.y, undefined, 5);
		}
	}
}

function resetQuestFlag() {
	if (questFlag && questFlag.listening) {
		gui.removeListener('QuestStartedMessage', onQuestStarted);
		gui.removeListener('CompassResetMessage', resetQuestFlag);
	}
	if (questFlag && (questFlag.questId !== null || questFlag.mapId !== null)) {
		GPS.removePOI('flag_srv' + CompassTypeEnum.COMPASS_TYPE_QUEST);
	}
	questFlag = {
		questId: null, // will remove the flag if this quest start
		mapId: null, // will remove the flag if this mapId is loaded
		listening: false // to know if we are listening for quest started event and GPS resets
	};
}

function addQuestFlag(x, y, questId, mapId) {
	resetQuestFlag();
	GPS.addPOI({
		id: 'flag_srv' + CompassTypeEnum.COMPASS_TYPE_QUEST,
		x: x,
		y: y,
		categoryId: 'hint',
		nameId: '(' + x + ',' + y + ')',
		color: { r: 85, g: 136, b: 0, a: 1 },
		isDestination: true
	});
	gui.on('QuestStartedMessage', onQuestStarted);
	gui.on('CompassResetMessage', resetQuestFlag);
	questFlag.listening = true;
	questFlag.questId = questId || null;
	questFlag.mapId = mapId || null;
}

function onQuestStarted(msg) {
	if (questFlag && questFlag.questId !== msg.questId) { return; }
	resetQuestFlag();
}

function checkIncarnamDungeonMapId() {
	if (gui.playerData.position.mapId === data.incarnamDungeon.firstMapId) {
		flags.dungeonKeyHintShown = true;
		userPref.setValue(gui.playerData.id + '-dungeonKeyHintShown', 1);
	}
	if (!questFlag || questFlag.mapId !== gui.playerData.position.mapId) { return; }
	resetQuestFlag();
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Exposing */

exports.initialize = initialize;
exports.openDialog = openDialog;
exports.onActorRemoved = onActorRemoved;
exports.reset = reset;
exports.removeAndClean = removeAndClean;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/beginnerAssistant/ui.js
 ** module id = 626
 ** module chunks = 0
 **/