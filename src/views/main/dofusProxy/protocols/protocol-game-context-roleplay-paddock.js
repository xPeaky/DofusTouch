var connectionManager = require('dofusProxy/connectionManager.js');


// PaddockPropertiesMessage
connectionManager.on('PaddockPropertiesMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

// PaddockSellBuyDialogMessage
connectionManager.on('PaddockSellBuyDialogMessage', function (msg) {
	window.gui.transmitMessage(msg);
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @event module:protocol/characterChoice.client_GameDataPlayFarmObjectAnimationMessage
 * @desc  A paddock object is animated.
 * @param {Object} msg - msg
 *        {number[]} msg.cellId - cell ids of the animated paddock object
 */
connectionManager.on('GameDataPlayFarmObjectAnimationMessage', function (msg) {
	for (var i = 0; i < msg.cellId.length; i++) {
		var actorId = 'paddockItem:' + msg.cellId[i];
		var actor = window.actorManager.getActor(actorId);
		if (!actor) { continue; }
		actor.loadAndPlayAnimation({ base: 'AnimHit', direction: 1 }, false);
	}
});


// PaddockToSellListMessage
connectionManager.on('PaddockToSellListMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-context-roleplay-paddock.js
 ** module id = 116
 ** module chunks = 0
 **/