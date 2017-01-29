var getText = require('getText').getText;
var login = require('login');
var windowsManager = require('windowsManager');

var justCreatedCharacter = false;
var gotSelectionError = false;
var characterListMsg; // CharactersListMessage or CharactersListWithModificationsMessage
var characterList = [];
var relookingParams, relookingResult;


// From Ankama's code
function checksum(s) {
	var r = 0;
	for (var i = 0; i < s.length; i++) {
		r += s.charCodeAt(i) % 16;
	}
	return (r % 16).toString(16).toUpperCase();
}

//--- From Ankama's code
function getRandomChar() {
	var n = Math.ceil(Math.random() * 100);

	// Maj
	if (n <= 40) {
		return String.fromCharCode(Math.floor(Math.random() * 26) + 65);
	}

	// Min
	if (n <= 80) {
		return String.fromCharCode(Math.floor(Math.random() * 26) + 97);
	}

	// Num
	return String.fromCharCode(Math.floor(Math.random() * 10) + 48);
}

// From Ankama's code (InterClientManager). Move to separate module if needed.
function getRandomFlashKey() {
	// Example: "O6FBjgAe3KaKyqL2XSu5B" in which B is the checksum
	var key = '';
	for (var i = 0; i < 20; i++) {
		key += getRandomChar();
	}
	return key + checksum(key);
}

var flashKey = getRandomFlashKey();

//---

function setErrorAndAskListAgain() {
	gotSelectionError = true;
	window.gui.openSimplePopup(getText('ui.common.cantSelectThisCharacter'), getText('ui.popup.impossible_action'));
	window.dofus.sendMessage('CharactersListRequestMessage');
}

function showCharacterSelectionPopup(msg) {
	characterListMsg = msg;
	characterList = msg.characters;

	// if no character go straight to the creation

	if (characterList.length === 0) {
		//NB: if character creation below is cancelled by user, we will be back to login screen
		windowsManager.closeAll();
		return windowsManager.open('characterCreation');
	}

	// just after creating a character

	if (justCreatedCharacter) {
		justCreatedCharacter = false;

		if (window.gui.playerData.accountCapabilities.tutorialAvailable) {
			window.dofus.sendMessage('CharacterFirstSelectionMessage', {
				id: characterList[0].id,
				doTutorial: window.gui.tutorialManager.isTutorialRequired()
			});
			return;
		}

		return exports.selectCharacter(characterList[0].id);
	}

	// if you got an error previously, show the full list

	if (gotSelectionError) {
		return windowsManager.open('characterSelection', characterList);
	}

	if (login.connectMethod === 'characterId') {
		if (login.characterId) {
			return exports.selectCharacter(login.characterId);
		}
		console.error(new Error('characterId is missing!'));
		windowsManager.open('characterSelection', characterList);
		return;
	}

	// check auto connect with most recently played character on chosen server

	if (login.connectMethod === 'lastCharacter') {
		return exports.selectCharacter(characterList[0].id);
	}

	windowsManager.open('characterSelection', characterList);
}

function reset() {
	justCreatedCharacter = false;
	gotSelectionError = false;
	characterList = [];
}

/**
 * Called when a character was created. Selects the newly created character (tutorial flag on)
 */
exports.confirmNewCharacterCreation = function () {
	justCreatedCharacter = true;
};

function getIndexInCharacterList(characterId) {
	for (var i = 0; i < characterList.length; i++) {
		if (characterList[i].id === characterId) { return i; }
	}
	return -1;
}

function searchCharacterInInfoList(list, characterId) {
	for (var i = 0; i < list.length; i++) {
		if (list[i].id === characterId) { return list[i]; }
	}
	return null;
}

function selectWithRelooking(characterId) {
	relookingParams = null;
	if (characterListMsg._messageType !== 'CharactersListWithModificationsMessage') {
		return false; // no relooking pending on this account
	}

	var params = {};
	if (characterListMsg.charactersToRename.indexOf(characterId) >= 0) {
		params.canRename = true;
	} else if (searchCharacterInInfoList(characterListMsg.charactersToRecolor, characterId)) {
		params.canRecolor = true;
	} else if (searchCharacterInInfoList(characterListMsg.charactersToRelook, characterId)) {
		params.canReface = true;
	} else {
		return false; // a relooking is pending but not on this character
	}
	params.characterToRelook = characterList[getIndexInCharacterList(characterId)];

	windowsManager.getWindow('characterSelection').hide();
	windowsManager.open('characterCreation', { relookingParams: params });
	relookingParams = params;
	return true;
}

exports.confirmCharacterRelooking = function (characterData) {
	var characterId = relookingParams.characterToRelook.id;
	relookingResult = characterData; // the result will be applied in applyRelookingToCharacterSelectedMsg

	if (relookingParams.canRename) {
		window.dofus.sendMessage('CharacterSelectionWithRenameMessage', {
			id: characterId,
			name: characterData.name
		});
	} else if (relookingParams.canRecolor) {
		window.dofus.sendMessage('CharacterSelectionWithRecolorMessage', {
			id: characterId,
			indexedColor: characterData.colors
		});
	} else if (relookingParams.canReface) {
		window.dofus.sendMessage('CharacterSelectionWithRelookMessage', {
			id: characterId,
			cosmeticId: characterData.cosmeticId
		});
	}
	// => we will receive CharacterSelectedSuccessMessage if success
	// ...or CharacterCreationResultMessage if error (only for renaming if name is refused)
};

/**
 * We need to do this because the server "forgets" that we relooked (even though we sent the proper info
 * in CharacterSelectionWithRenameMessage and alike) so the CharacterSelectedSuccessMessage we received
 * STILL has the old character information... If we let this bad data pass to the rest of the UI,
 * our relooking would be missing in all Character Renderers (WebGL rendering not impacted).
 * => so we "simply" patch this message with new data...
 */
function applyRelookingToCharacterSelectedMsg(msg) {
	if (relookingParams.canRename) {
		msg.infos.name = relookingResult.name;
	} else if (relookingParams.canRecolor) {
		msg.infos.entityLook.indexedColors = relookingResult.colors;
	} else if (relookingParams.canReface) {
		msg.infos.entityLook.skins[1] = relookingResult.headSkin;
	}
}

function validateCharacterSelection(msg) {
	gotSelectionError = false;
	windowsManager.close('characterSelection');

	if (relookingParams) {
		windowsManager.close('characterCreation');
		applyRelookingToCharacterSelectedMsg(msg);
	}

	window.gui.transmitMessage(msg);

	window.actorManager.setUserCharacterData(msg.infos);

	window.dofus.sendMessage('ClientKeyMessage', { key: flashKey });
	window.dofus.sendMessage('GameContextCreateRequestMessage');
}

/**
 * Called when a character is selected for playing (but not yet accepted by server)
 */
exports.selectCharacter = function (characterId) {
	if (selectWithRelooking(characterId)) {
		return;
	}
	window.dofus.sendMessage('CharacterSelectionMessage', { id: characterId });
};

/**
 * Close all the windows. If there is at least 1 character -> got to the characterSelection,
 * if not go to the serverSelection
 */
exports.backToSelection = function () {
	windowsManager.closeAll();
	//NB: do not ask for gift on come back

	// if there is no characters, go back to servers selection

	if (characterList.length === 0) {
		return windowsManager.open('serverSelection');
	}

	windowsManager.open('characterSelection', characterList);
};

/**
 * Initializes the module - sets handlers on GUI messages
 */
exports.initialize = function (gui) {
	var connectionManager = window.dofus.connectionManager;

	/**
	 * @event module:protocol/characterChoice.client_CharacterSelectedErrorMissingMapPackMessage
	 * @desc  Should be OK to ignore: selected character cannot be in a map we cannot load.
	 */

	/**
	 * @event module:protocol/characterChoice.client_CharactersListErrorMessage
	 * @desc  Handled at proxy level. See module:msgEnrichment/errors
	 */

	/**
	 * @event module:protocol/characterChoice.client_BasicCharactersListMessage
	 * @desc  Ignored in our client because we use the info from CharacterSelectedSuccessMessage.
	 *        Receive user character list without character looks.
	 *        This message is received when user reconnect directly in a fight, in that case the
	 *        characters selection window is not displayed and thus, character looks are not needed.
	 *        (see CharacterSelectedForceMessage)
	 */

	/**
	 * @event module:protocol/characterChoice.client_CharacterSelectedForceMessage
	 * @desc  The server force user to select a character,
	 *        because user logged out in the middle of a fight.
	 */
	connectionManager.on('CharacterSelectedForceMessage', function () {
		window.dofus.sendMessage('CharacterSelectedForceReadyMessage');
	});

	/**
	 * @event module:protocol/characterChoice.client_CharactersListMessage
	 */
	connectionManager.on('CharactersListMessage', showCharacterSelectionPopup);

	/**
	 * @event module:protocol/characterChoice.client_CharactersListWithModificationsMessage
	 */
	connectionManager.on('CharactersListWithModificationsMessage', showCharacterSelectionPopup);

	/**
	 * @event module:protocol/characterChoice.client_CharacterSelectedSuccessMessage
	 * @desc  character selection succeeded. Server sends back the character informations
	 * @param {object} msg - msg
	 * @param {CharacterBaseInformations}  msg.infos - character informations
	 */
	connectionManager.on('CharacterSelectedSuccessMessage', validateCharacterSelection);

	/** @event module:protocol/characterChoice.client_CharacterSelectedErrorMessage
	 *  @desc  We failed to select character; for example last character played is dead
	 */
	connectionManager.on('CharacterSelectedErrorMessage', setErrorAndAskListAgain);

	gui.on('disconnect', reset);
};

/**
 * Gets the list of available characters for login.
 * @returns {Array}
 */
exports.getCharacterList = function () {
	return characterList;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/characterSelection/index.js
 ** module id = 440
 ** module chunks = 0
 **/