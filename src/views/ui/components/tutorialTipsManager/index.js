var FightOutcomeEnum = require('FightOutcomeEnum');
var gameOptions = require('gameOptions');
var hyperlink = require('hyperlink');
var staticContent = require('staticContent');
var userPref = require('UserPreferences');
var windowsManager = require('windowsManager');


var tipsStaticData = {};
var playerTipsStatus = {};
var eventsInfoMap = {}; // Information about the event and eventListener for each tip
var eventHandlersMap = {}; // store the eventHandlers that were registered
var displayedNotifications = [];
var isEnable = true;
var silentMode = false;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

function getTriggerId(trigger) {
	trigger = trigger || '';
	return trigger.split(',')[0];
}

function removeListener(tipId) {
	var handler = eventHandlersMap[tipId];

	if (!handler) {
		return;
	}

	var tip = tipsStaticData[tipId];
	var triggerId = getTriggerId(tip.trigger);
	var eventsInfo = eventsInfoMap[triggerId];
	var eventsList = eventsInfo.eventsList || [];

	for (var i = 0; i < eventsList.length; i += 1) {
		var eventParams = eventsList[i];
		eventParams.listener.removeListener(eventParams.eventId, handler);
	}

	delete eventHandlersMap[tipId];
}

function removeListeners() {
	var eventHandlersList = Object.keys(eventHandlersMap);

	for (var i = 0; i < eventHandlersList.length; i += 1) {
		var tipId = eventHandlersList[i];
		removeListener(tipId);
	}
}

function deactivate() {
	removeListeners();

	for (var i = 0; i < displayedNotifications.length; i += 1) {
		window.gui.notificationBar.removeNotification(displayedNotifications[i]);
	}

	displayedNotifications = [];
}

function notificationClosed(notificationId) {
	var index = displayedNotifications.indexOf(notificationId);
	if (index >= 0) {
		displayedNotifications.splice(index, 1);
	}
}

function displayNotification(tip) {
	var tipId = tip.id;
	var notificationId = 'tip' + tipId;
	var notificationBar = window.gui.notificationBar;

	if (notificationBar.isNotificationOpen(notificationId) || playerTipsStatus[tipId]) {
		return;
	}

	var desc = {
		type: notificationBar.notificationType.TUTORIAL,
		title: tip.titleId,
		wuidom: hyperlink.process(tip.messageId),
		onClose: function () {
			window.dofus.sendMessage('NotificationUpdateFlagMessage', { index: tipId });
			playerTipsStatus[tipId] = true;
			// notification closed, update displayedNotifications list
			notificationClosed(notificationId);
		}
	};

	notificationBar.newNotification(notificationId, desc);

	displayedNotifications.push(notificationId);

	// notification displayed, remove the listener
	removeListener(tipId);
}

function registerListeners() {
	for (var tipId in tipsStaticData) {
		var tip = tipsStaticData[tipId];
		var triggerId = getTriggerId(tip.trigger);
		var eventsInfo = eventsInfoMap[triggerId];

		if (!triggerId || !eventsInfo || playerTipsStatus[tipId]) {
			continue;
		}

		// display straight away if is triggerId type 'GameStart'
		if (triggerId === 'GameStart') {
			displayNotification(tip);
			continue;
		}

		var eventsList = eventsInfo.eventsList || [];

		for (var i = 0; i < eventsList.length; i += 1) {
			var eventParams = eventsList[i];
			var listener = eventParams.listener;
			var eventId = eventParams.eventId;

			if (!eventHandlersMap[tipId]) {
				var handlerFunc = eventsInfo.customFunc || displayNotification;
				eventHandlersMap[tipId] = handlerFunc.bind(null, tip);
			}

			var handler = eventHandlersMap[tipId];
			listener.on(eventId, handler);
		}
	}
}

function activate() {
	// removeNotification is wrapped with a setTimeout, we add setTimeout to registerListeners too
	// so that registerListeners will always called after all the notifications were removed
	setTimeout(function () {
		registerListeners();
	}, 0);
}

function fightVictory(tip, msg) {
	var results = msg.results || [];

	for (var i = 0; i < results.length; i += 1) {
		var result = results[i];
		if (result.id === window.gui.playerData.id && result.outcome === FightOutcomeEnum.RESULT_VICTORY) {
			return displayNotification(tip);
		}
	}
}

function monsterInMap(tip, msg) {
	var actors = msg.actors || [];

	for (var i = 0; i < actors.length; i += 1) {
		if (actors[i]._type === 'GameRolePlayGroupMonsterInformations') {
			return displayNotification(tip);
		}
	}
}

function playerMovement(tip, msg) {
	if (msg.actorId !== window.gui.playerData.id) {
		return;
	}
	displayNotification(tip);
}

function initEventsInfoMap() {
	var gui = window.gui;
	var playerData = gui.playerData;
	var grimoireWindow = windowsManager.getWindow('grimoire');

	eventsInfoMap = {
		CharacterLevelUp: {
			eventsList: [
				{ listener: playerData, eventId: 'characterLevelUp' }
			]
		},
		//CreaturesMode: '', // TODO: Feature not done yet, implement later
		FightResultVictory: {
			customFunc: fightVictory,
			eventsList: [
				{ listener: gui, eventId: 'GameFightEndMessage' }
			]
		},
		FightSpellCast: {
			eventsList: [
				{ listener: gui, eventId: 'GameActionFightSpellCastMessage' },
				{ listener: gui, eventId: 'GameActionFightCloseCombatMessage' }
			]
		},
		GameFightStart: {
			eventsList: [
				{ listener: gui, eventId: 'GameFightStartMessage' }
			]
		},
		GameFightStarting: {
			eventsList: [
				{ listener: gui, eventId: 'GameFightStartingMessage' }
			]
		},
		GameRolePlayPlayerLifeStatus: {
			eventsList: [
				{ listener: gui, eventId: 'GameRolePlayPlayerLifeStatusMessage' }
			]
		},
		GameStart: {}, // GameStart will be specifically handled
		LifePointsRegenBegin: {
			eventsList: [
				{ listener: gui, eventId: 'LifePointsRegenBeginMessage' }
			]
		},
		MapWithMonsters: {
			customFunc: monsterInMap,
			eventsList: [
				{ listener: gui, eventId: 'MapComplementaryInformationsDataMessage' }
			]
		},
		NpcDialogCreation: {
			eventsList: [
				{ listener: gui, eventId: 'NpcDialogCreationMessage' }
			]
		},
		OpenBook: {
			eventsList: [
				{ listener: grimoireWindow, eventId: 'open' }
			]
		},
		OpenGrimoireAlignmentTab: {
			eventsList: [
				{ listener: grimoireWindow.tabs.getTabTarget('alignment'), eventId: 'open' }
			]
		},
		OpenGrimoireJobTab: {
			eventsList: [
				{ listener: grimoireWindow.tabs.getTabTarget('jobs'), eventId: 'open' }
			]
		},
		OpenGrimoireQuestTab: {
			eventsList: [
				{ listener: grimoireWindow.tabs.getTabTarget('quests'), eventId: 'open' }
			]
		},
		OpenGrimoireSpellTab: {
			eventsList: [
				{ listener: grimoireWindow.tabs.getTabTarget('spells'), eventId: 'open' }
			]
		},
		OpenInventory: {
			eventsList: [
				{ listener: windowsManager.getWindow('equipment'), eventId: 'open' }
			]
		},
		//OpenSmileys: '', // TODO: Feature not done yet, implement later
		OpenStats: {
			eventsList: [
				{ listener: windowsManager.getWindow('characteristics'), eventId: 'open' }
			]
		},
		PlayerFightMove: {
			customFunc: playerMovement,
			eventsList: [
				{ listener: gui, eventId: 'GameMapMovementMessage' }
			]
		},
		PlayerIsDead: {
			eventsList: [
				{ listener: playerData, eventId: 'playerIsDead' }
			]
		},
		PlayerMove: {
			customFunc: playerMovement,
			eventsList: [
				{ listener: window.dofus, eventId: 'GameMapMovementMessage' }
			]
		},
		PlayerNewSpell: {
			eventsList: [
				{ listener: playerData.characters.mainCharacter, eventId: 'newSpellLearned' }
			]
		}
	};
}

function getTipsStaticData(cb) {
	staticContent.getAllDataMap('Notifications', function (error, map) {
		if (error) {
			return cb(error);
		}
		tipsStaticData = map;
		cb();
	});
}

function init(cb) {
	getTipsStaticData(function (error) {
		if (error) {
			return cb(error);
		}
		initEventsInfoMap();
		cb();
	});
}

function updatePlayerTipsStatus(flags) {
	playerTipsStatus = {};

	// logic from flash version
	for (var i = 0; i < flags.length; i += 1) {
		var flag = flags[i];
		for (var bit = 0; bit < 32; bit += 1) {
			playerTipsStatus[bit + i * 32] = !!(flag & 1);
			flag >>= 1;
		}
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

exports.initialize = function (gui) {
	gui.once('initialized', function () {
		// update isEnable with option data
		isEnable = userPref.getValue('option-tutorialTips', true);

		gameOptions.on('tutorialTips', function (value) {
			exports.enableTips(value);
		});

		init(function (error) {
			if (error) {
				return console.error(error);
			}
		});
	});

	gui.tutorialManager.on('inTutorialStateChanged', function (inTutorial) {
		// turn on silent mode if we are in tutorial
		silentMode = inTutorial;

		if (silentMode) {
			deactivate();
			window.gui.notificationBar.clearNotifications();
		} else if (isEnable && !silentMode) {
			activate();
		}
	});

	gui.on('disconnect', function () {
		deactivate();
		silentMode = false;
	});

	gui.on('NotificationListMessage', function (msg) {
		updatePlayerTipsStatus(msg.flags);
	});
};

exports.enableTips = function (shouldEnable) {
	isEnable = shouldEnable;

	// we do not want any event to happen while silent mode is on
	if (silentMode) {
		return;
	}

	if (isEnable) {
		activate();
	} else {
		deactivate();
	}
};

/**
* Note:
* We do not get any response from the server by default after sending NotificationResetMessage.
* So, we assume the notification is reset and we clear the playerTipsStatus and remove and register
* all the events again
**/
exports.resetTips = function () {
	window.dofus.sendMessage('NotificationResetMessage');
	updatePlayerTipsStatus([0]);

	// do not reset events if is not enable or silentMode
	if (!isEnable || silentMode) {
		return;
	}

	deactivate();
	activate();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/tutorialTipsManager/index.js
 ** module id = 599
 ** module chunks = 0
 **/