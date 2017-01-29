var staticContent = require('staticContent');


function NpcDialogHandler() {
	this.inDialog = false;
	this.npcData = null;
	this.npcActorId = null;

	this.uiReplyHandler = this._uiReplyHandler.bind(this);

	this._setListeners();
}
module.exports = NpcDialogHandler;


NpcDialogHandler.prototype._setListeners = function () {
	var connectionManager = window.dofus.connectionManager;
	var self = this;

	/**
	 * @event module:protocol/roleplay.client_NpcGenericActionFailureMessage
	 * @desc  OK to ignore but we use it to unlock the foreground since dialog did not open
	 */
	connectionManager.on('NpcGenericActionFailureMessage', function () {
		// NB: do not display error here OTHERWISE check Japan Expo code that sends NpcGenericActionFailureMessage too
		window.foreground.unlock('npcActionRequest');
	});

	/**
	 * @event module:protocol/roleplay.client_NpcDialogCreationMessage
	 * @desc  The servers asks client to start the "dialog pending" mode (e.g. we cannot move)
	 */
	connectionManager.on('NpcDialogCreationMessage', function (msg) {
		self.npcActorId = msg.npcId;
		// for weddings: 2nd person has to shut-up before being actually asked to answer
		window.foreground.lock('npcActionRequest');
	});

	connectionManager.on('GameContextCreateMessage', function () {
		window.foreground.unlock('npcActionRequest');
	});

	window.isoEngine.on('mapLoaded', function () {
		window.foreground.unlock('npcActionRequest');
	});

	/**
	 * @event module:protocol/roleplay.client_NpcDialogQuestionMessage
	 *
	 * @param {object} msg - msg
	 * @param {number}    msg.messageId
	 * @param {Array}     msg.dialogParams
	 * @param {number[]}  msg.visibleReplies
	 */
	connectionManager.on('NpcDialogQuestionMessage', function (msg) {
		// for some dialogs (e.g. wedding) the NPC initiates the talk so prepareDialog has not been called yet
		if (!self.npcData) {
			var npcData = window.actorManager.getActor(self.npcActorId).data.npcData;
			self.prepareDialog(npcData);
		}
		self.nextQuestionAsync(msg.messageId, msg.visibleReplies, msg.dialogParams);
	});

	connectionManager.on('LeaveDialogMessage', function () {
		// in weddings, NpcDialogCreationMessage can be followed by LeaveDialogMessage (if spouse refuses)
		window.foreground.unlock('npcActionRequest');
		if (!self.inDialog) { return; } // not open
		window.gui.npcDialogUi.leaveDialog();
		self.inDialog = false;
	});

	connectionManager.on('ExchangeLeaveMessage', function () {
		window.foreground.unlock('npcActionRequest');
	});
};

NpcDialogHandler.prototype.prepareDialog = function (npcData) {
	this.npcData = npcData;

	//we create 2 maps to be able to retrieve corresponding "text ID" for each "message" and "reply"
	var pair, i;
	var msgs = this.msgTextIds = {};
	for (i = 0; i < npcData.dialogMessages.length; i++) {
		pair = npcData.dialogMessages[i];
		msgs[pair[0]] = pair[1];
	}
	msgs = this.replyTextIds = {};
	for (i = 0; i < npcData.dialogReplies.length; i++) {
		pair = npcData.dialogReplies[i];
		msgs[pair[0]] = pair[1];
	}
};

/** Similar to server side AssetManager.replaceParameters besides this one uses "#" */
function replaceDialogParams(text, parameters) {
	for (var n = 0; n < parameters.length; n++) {
		text = text.replace('#' + (n + 1), parameters[n]);
	}
	return text;
}

//Initiate the requests for content of the window (message and replies)
NpcDialogHandler.prototype.nextQuestionAsync = function (messageId, replyIds, dialogParams) {
	this.inDialog = true;
	this.replyIds = replyIds;
	window.gui.npcDialogUi.prepareForNextQuestion(this.npcData, replyIds.length);

	//gather all text IDs (message and replies)
	var messageTextId = this.msgTextIds[messageId];
	var textIds = [messageTextId];
	for (var i = 0; i < replyIds.length; i++) {
		textIds.push(this.replyTextIds[replyIds[i]]);
	}
	//request the texts from server
	var self = this;
	staticContent.getText(textIds, function (error, texts) {
		if (error) {
			console.error('Failed to get texts for NPC. textIds:', textIds, 'error:', error);
			return self._closeDialog();
		}

		var msg = replaceDialogParams(texts[messageTextId], dialogParams);

		var replies = [];
		for (i = 0; i < replyIds.length; i++) {
			replies.push(texts[self.replyTextIds[replyIds[i]]]);
		}

		// now we are ready to show the UI
		self._showUi(msg, replies);
	});
};

NpcDialogHandler.prototype._uiReplyHandler = function (replyId) {
	if (replyId !== null) {
		window.dofus.sendMessage('NpcDialogReplyMessage', { replyId: this.replyIds[replyId] });
	} else {
		// Either an "auto-close" (no answer expected) or the player used the "Cancel dialog" button
		this._closeDialog();
	}
};

NpcDialogHandler.prototype._closeDialog = function () {
	window.dofus.sendMessage('LeaveDialogRequestMessage', null); // we will receive "LeaveDialogMessage"
	this.npcData = null;
};

//Open UI with the received message and replies
NpcDialogHandler.prototype._showUi = function (msg, replies) {
	var options = { npcData: this.npcData };

	window.gui.npcDialogUi.showNpcQuestion(msg, replies, this.uiReplyHandler, options);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/NpcDialogHandler/index.js
 ** module id = 504
 ** module chunks = 0
 **/