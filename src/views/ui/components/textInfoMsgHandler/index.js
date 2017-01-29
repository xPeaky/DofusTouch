var channelsEnum = require('ChatActivableChannelsEnum');
var getText = require('getText').getText;
var moneyConverter = require('moneyConverter');
var TextInformationTypeEnum = require('TextInformationTypeEnum');

var KAMA_CONVERT_MSGID  = 221; // e.g. "Your character has been debited 2 kamas from the Ogrine Market Place."
var KAMA_CONVERT2_MSGID = 220; // same msg as 221, but we receive it when trying to buy a paddock/house
var KAMA_LOST_MSGID     = 46;  // e.g. "You have lost 1 kamas."


function TextInfoMsgHandler() {
	this.handlerMap = {};
	this.handlerMap[KAMA_CONVERT_MSGID] = this.kamaConvertHandler;
	this.handlerMap[KAMA_CONVERT2_MSGID] = this.kamaConvertHandler;
	this.handlerMap[KAMA_LOST_MSGID] = this.kamaLostHandler;

	this.previousConvertedKamaAmount = null;
}


TextInfoMsgHandler.prototype.initialize = function () {
	var self = this;
	var connectionManager = window.dofus.connectionManager;

	// Map below corresponds to Flash code
	var textInfoMsgTypeToChannelMap = {};
	textInfoMsgTypeToChannelMap[TextInformationTypeEnum.TEXT_INFORMATION_MESSAGE] = channelsEnum.PSEUDO_CHANNEL_INFO;
	textInfoMsgTypeToChannelMap[TextInformationTypeEnum.TEXT_INFORMATION_PVP] = channelsEnum.CHANNEL_ALLIANCE;
	textInfoMsgTypeToChannelMap[TextInformationTypeEnum.TEXT_INFORMATION_FIGHT] = channelsEnum.PSEUDO_CHANNEL_FIGHT_LOG;

	/** @event module:protocol/basic.client_TextInformationMessage */
	connectionManager.on('TextInformationMessage', function (msg) {
		// Redirect ADMIN_DEBUG messages to console. Nicer for demos (e.g. Japan Expo)
		if (msg.parameters[0] === 'ADMIN_DEBUG') { return console.warn(msg.text); }

		var infoMsgId = msg.msgType * 10000 + msg.msgId;
		var handler = self.handlerMap[infoMsgId];
		if (handler) {
			if (!handler.call(self, msg)) { return; }
		}

		if (msg.msgType === TextInformationTypeEnum.TEXT_INFORMATION_ERROR) {
			window.gui.chat.logError(msg.text);
		} else {
			window.gui.chat.logMsg(msg.text, textInfoMsgTypeToChannelMap[msg.msgType]);
		}
	});
};

TextInfoMsgHandler.prototype.kamaConvertHandler = function (msg) {
	this.previousConvertedKamaAmount = ~~msg.parameters[0];
	return false; // not showed in chat (message says "Ogrine" anyway!)
};

TextInfoMsgHandler.prototype.kamaLostHandler = function (msg) {
	var kamaAmount = ~~msg.parameters[0];
	if (kamaAmount !== this.previousConvertedKamaAmount) {
		// Expected amount was not received => we give up on previous amount
		this.previousConvertedKamaAmount = null;
		return true; // display "as is" in the chat
	}
	this.previousConvertedKamaAmount = null; // only convert once

	var goultineAmount = moneyConverter.computeHardPrice(kamaAmount);
	if (!goultineAmount) { return console.warn('Cannot convert currency'); }

	msg.text = getText('tablet.spent.hard', goultineAmount);

	return true; // displayed modified version in the chat
};

module.exports = new TextInfoMsgHandler();



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/textInfoMsgHandler/index.js
 ** module id = 628
 ** module chunks = 0
 **/