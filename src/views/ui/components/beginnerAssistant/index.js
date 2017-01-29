/**
 * Root of the beginner assistant (aka Joris).
 *  Mostly used to detect when we need him and returns as soon as we know he's not required,
 *  or if we may need him, listen quietly until we really do and then fully initializating him.
 *
 * All Joris triggers and behaviors are described in the following file:
 *  https://docs.google.com/spreadsheets/d/1PwqEeftqc8Xm0LFsC1-wPRxpIQjrrUEVrlpdoinCtwE
 */

require('./styles.less');
var actor = require('./actor.js');
var ui = require('./ui.js');
var uiUnlocker = require('./uiUnlocker.js');
var data = require('./data.js');
var GameContextEnum = require('GameContextEnum');

// To enable/disable completly the feature
var ENABLED = true;

// Local variables
var gui, isoEngine;

// To know if assistant was required during the last test
var required = false;

// Called only one time per app launch
function initialize() {
	gui = window.gui;
	isoEngine = window.isoEngine;

	// not using 'connected' to be sure we already have current character level
	gui.playerData.on('characterSelectedSuccess', onConnected);
}

// Called only one time per character connection
function onConnected() {
	// we are not going to use the game assistant
	if (!ENABLED) { return; }

	// may the beginner assistant appear at any time during the current character game session?
	if (!mayBeginnerAssistantBeRequired()) { return; }

	// yes we may; we are going to check after every map load if we need to activate/init him
	isoEngine.on('mapLoaded', onMapLoaded);
	gui.once('disconnect', onDisconnect);
}

// The only moment where we know if assistant is required is when map is loaded
function onMapLoaded() {
	// if some delayed calls are still pending
	gui.playerData.position.removeListener('worldMapUpdate', onMapLoaded);
	gui.tutorialManager.removeListener('inTutorialStateChanged', onMapLoaded);

	if (gui.playerData.position.worldmapId === 0) {
		// static data are not loaded yet, let's delay
		gui.playerData.position.once('worldMapUpdate', onMapLoaded);
		return;
	}

	if (gui.tutorialManager.inTutorial === undefined) {
		// tutorial has not been initialised yet, let's delay
		gui.tutorialManager.once('inTutorialStateChanged', onMapLoaded);
		return;
	}

	// beginner asisstant is not required for the time being
	if (!isBeginnerAssistantRequired()) { return; }

	// beginner assistant is required, we don't need this listener anymore
	isoEngine.removeListener('mapLoaded', onMapLoaded);

	// initializating assistant modules, from now everything is delegated to them
	actor.initialize();
	ui.initialize();
	uiUnlocker.initialize();
}

// Cleaning
function onDisconnect() {
	isoEngine.removeListener('mapLoaded', onMapLoaded);
	gui.playerData.position.removeListener('worldMapUpdate', onMapLoaded);
	gui.tutorialManager.removeListener('inTutorialStateChanged', onMapLoaded);
	required = false;
}

// If this returns false, the assistant will never be required with the current character
function mayBeginnerAssistantBeRequired() {
	return gui.playerData.characterBaseInformations.level <= data.characterLevelLimit;
}

// To determine if beginner assistant is currently required
function isBeginnerAssistantRequired(options) {
	// not in the tutorial
	if (gui.tutorialManager.inTutorial) {
		return false;
	}

	// not in fight
	if (isoEngine.gameContext === GameContextEnum.FIGHT && (!options || !options.fightContextAllowed)) {
		return false;
	}

	// default behaviour when assistant is not required anymore is to keep him until
	//  he says good bye and reset `required` at this moment

	// not on Incarnam
	if (gui.playerData.position.worldmapId !== data.INCARNAM_WORLD_MAP) {
		return required;
	}

	// level too high
	if (gui.playerData.characterBaseInformations.level > data.characterLevelLimit) {
		return required;
	}

	// he is required
	required = true;
	return true;
}

function setRequired(value) {
	required = value;
}

// called when assistant will not be required again, ever, for the current character
function removeAndClean() {
	onDisconnect();
	actor.removeAndClean();
	ui.removeAndClean();
	uiUnlocker.removeAndClean();
}

// To turn on/off the assistant from command line or modify ui lock current state
function adminCommand(options) {
	var wrongParamsMsg = 'Wrong parameter, allowed parameters are: on, ui reset, ui unlock, trigger reset';
	if (!options) { return wrongParamsMsg; }
	if (options.length === 1 && options[0] === 'on') {
		if (ENABLED) { return 'Already activated'; }
		ENABLED = true;
		onConnected();
		return 'Activated';
	}
	if (options.length === 2) {
		if (options[0] === 'ui') {
			if (options[1] === 'reset') {
				uiUnlocker.reset();
				return 'Done';
			} else if (options[1] === 'unlock') {
				uiUnlocker.unlockAll();
				return 'Done';
			}
		} else if (options[0] === 'trigger') {
			if (options[1] === 'reset') {
				ui.reset();
				return 'Done';
			}
		}
	}
	return wrongParamsMsg;
}

// Exposing
exports.initialize = initialize;
exports.isBeginnerAssistantRequired = isBeginnerAssistantRequired;
exports.adminCommand = adminCommand;
exports.openDialog = ui.openDialog;
exports.setRequired = setRequired;
exports.removeAndClean = removeAndClean;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/beginnerAssistant/index.js
 ** module id = 605
 ** module chunks = 0
 **/