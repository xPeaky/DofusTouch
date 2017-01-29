var inherits = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var Button = require('Button');
var windowsManager = require('windowsManager');

function npcActionRequest(npcData, npcId, mapId, npcActionId) {
	switch (npcActionId) {// corresponding to a value in 'tbl_game_npc_action' table
	case 2: // exchange with the NPC
	case 4: // Drop off/collect a pet
		windowsManager.getWindow('tradeWithNPC').prepareExchange(npcData.nameId);
		break;
	case 3: // talk with the NPC
		window.gui.npcDialogHandler.prepareDialog(npcData);
		break;
	default:
		break;
	}

	// We prevent other taps before doing the request: we don't want actions in between
	window.foreground.lock('npcActionRequest');

	window.dofus.sendMessage('NpcGenericActionRequestMessage', {
		npcId: npcId,
		npcActionId: npcActionId,
		npcMapId: mapId
	});

	// requesting house or paddock listing, we are not sure the server will answer
	if (npcActionId === 9 || npcActionId === 10) {
		var foreground = window.foreground;
		var gui = window.gui;
		var expectedMessage = (npcActionId === 9) ? 'HouseToSellListMessage' : 'PaddockToSellListMessage';
		// timeout removing the lock if the server does not answer
		var timeout = setTimeout(function () {
			console.error(new Error(expectedMessage + ' not received: timeout triggered to unlock the character'));
			foreground.unlock('npcActionRequest');
			gui.removeListener(expectedMessage, messageReceived);
		}, 5000);
		// if the server answer, we unlock and remove the timeout
		var messageReceived = function () {
			foreground.unlock('npcActionRequest');
			clearTimeout(timeout);
		};
		window.gui.once(expectedMessage, messageReceived);
	}
}

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function ContextualMenuNpc() {
	ContextualMenu.call(this);
	var self = this;

	this.once('open', function () {
		this._setupDom();
	});

	this.on('open', function (data, contentReady) {
		var npcData = data.npcData;
		var npcId = data.actorId;
		var mapId = data.mapId;

		function buttonCallback() {
			npcActionRequest(npcData, npcId, mapId, this.npcActionId);
			self.close();
		}

		this.header.setText(npcData.nameId);

		this.actionsContainer.clearContent();

		var isEnabled = window.gui.playerData.isAlive();
		for (var i = 0, len = npcData.actions.length; i < len; i++) {
			var button = this.actionsContainer.appendChild(new Button(
				{ text: npcData.actionsName[i], className: 'cmButton', disable: !isEnabled },
				buttonCallback
			));
			button.npcActionId = npcData.actions[i];
		}

		contentReady();
	});
}

inherits(ContextualMenuNpc, ContextualMenu);
module.exports = ContextualMenuNpc;

ContextualMenuNpc.npcActionRequest = npcActionRequest;

// ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** create component dom elements
 * @private
 */
ContextualMenuNpc.prototype._setupDom = function () {
	var container = this.entryList.createChild('div');

	this.actionsContainer = container.createChild('div');

	this._addCancel();
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuNpc/index.js
 ** module id = 412
 ** module chunks = 0
 **/