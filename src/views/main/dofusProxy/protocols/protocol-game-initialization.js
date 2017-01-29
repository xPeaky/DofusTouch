var connectionManager = require('dofusProxy/connectionManager.js');


// OnConnectionEventMessage

// SetCharacterRestrictionsMessage
connectionManager.on('SetCharacterRestrictionsMessage', function (msg) {
	window.isoEngine.actorManager.userActor.updateRestrictions(msg.restrictions);
});

// ServerExperienceModificatorMessage
connectionManager.on('ServerExperienceModificatorMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// CharacterCapabilitiesMessage

// CharacterLoadingCompleteMessage



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-initialization.js
 ** module id = 127
 ** module chunks = 0
 **/