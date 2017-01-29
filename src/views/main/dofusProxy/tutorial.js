// List of listeners that will be register only when we are in tutorial

function GameMapMovementMessage(msg) {
	window.gui.transmitMessage({
		_messageType: '_tutorialGameMapMovementMessage',
		actorId: msg.actorId
	});
}

function GameEntitiesDispositionMessage() {
	window.gui.transmitMessage({
		_messageType: '_tutorialGameEntitiesDispositionMessage'
	});
}

exports.setTutorialListeners = function (connectionManager) {
	connectionManager.on('GameMapMovementMessage', GameMapMovementMessage);
	connectionManager.on('GameEntitiesDispositionMessage', GameEntitiesDispositionMessage);
};

exports.removeTutorialListeners = function (connectionManager) {
	connectionManager.removeListener('GameMapMovementMessage', GameMapMovementMessage);
	connectionManager.removeListener('GameEntitiesDispositionMessage', GameEntitiesDispositionMessage);
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/tutorial.js
 ** module id = 154
 ** module chunks = 0
 **/