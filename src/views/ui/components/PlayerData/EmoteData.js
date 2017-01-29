var EventEmitter = require('events.js').EventEmitter;
var getText = require('getText').getText;
var inherits = require('util').inherits;
var staticContent = require('staticContent');

function EmoteData() {
	EventEmitter.call(this);

	this.list = {};
}
inherits(EmoteData, EventEmitter);
module.exports = EmoteData;


EmoteData.prototype.disconnect = function () {
	this.list = {};
};

EmoteData.prototype.initialize = function (gui) {
	var self = this;

	gui.on('EmoteListMessage', function (msg) {
		staticContent.getDataMap('Emoticons', msg.emoteIds, function (error, emotes) {
			if (error) {
				return console.error('could not retrieve emotes data', error);
			}

			for (var id in emotes) {
				if (emotes[id]) { // there are some missing emoticons in the db
					self.list[id] = emotes[id];
				}
			}
			self.emit('emoteListUpdated', self.list);
		});
	});

	gui.on('EmoteAddMessage', function (msg) {
		staticContent.getData('Emoticons', msg.emoteId, function (error, res) {
			if (error) {
				return console.error('could not retrieve emotes data', error);
			}

			var id = res.id;
			if (self.list[id]) {
				return;
			}
			self.list[id] = res;
			window.gui.chat.logMsg(getText('ui.common.emoteAdded', [res.nameId]));
			self.emit('emoteAdded', res);
		});
	});

	gui.on('EmoteRemoveMessage', function (msg) {
		var emote = self.list[msg.emoteId];
		if (!emote) {
			return;
		}

		window.gui.chat.logMsg(getText('ui.common.emoteRemoved', [emote.nameId]));
		delete self.list[msg.emoteId];
		self.emit('emoteRemoved', msg.emoteId);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/EmoteData.js
 ** module id = 523
 ** module chunks = 0
 **/