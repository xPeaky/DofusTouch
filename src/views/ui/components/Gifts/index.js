var inherits = require('util').inherits;
var EventEmitter = require('events.js').EventEmitter;
var itemManager = require('itemManager');
var windowsManager = require('windowsManager');
var characterSelection = require('characterSelection');
var getText = require('getText').getText;

/**
 * Gifts module
 * @constructor
 */
function Gifts() {
	EventEmitter.call(this);

	var self = this;
	var gui = window.gui;

	this._characterList = [];
	this._charaListMinusDeadPeople = [];
	this._giftList = [];
	this._assigningGifts = {};

	// need to wait GUI to be initialized to setupEvents

	gui.once('initialized', function () {
		self._setupEvents();
	});

	gui.on('disconnect', function () {
		self._reset();
	});
}

inherits(Gifts, EventEmitter);
module.exports = Gifts;

/**
 * @private
 */
Gifts.prototype._setupEvents = function () {
	var self = this;

	window.dofus.connectionManager.on('StartupActionsListMessage', function (msg) {
		// we received the gift message but no gift inside
		if (!msg.actions.length) { return; }

		// init/update the character list
		self.setCharacterList(characterSelection.getCharacterList());

		self._createGiftList(msg, function (error) {
			if (error) { // if errors, do nothing
				return console.error(new Error('Gifts module StartupActionsListMessage: ' + error));
			}
			if (!self._giftList.length) { // this should never happen
				return console.error(new Error('Gifts module StartupActionsListMessage: _giftList is empty'));
			}
			if (!self.getCharaListMinusDeadPeople().length) { // if no alive characters, do nothing
				return;
			}

			windowsManager.open('giftSelection', self._giftList);
		});
	});

	/** When assigning a gift to a character, we receive two times a StartupActionFinishedMessage message:
	 *  - The first time, the server tells the client that his request has been received and that he's sending a
	 *    confirmation request to the DBs/shop to be sure the item is still available.
	 *  - The second time we receive the message, it means the assignement has been done succesfully.
	 *
	 * @param {object}  msg
	 * @param {boolean} msg.success         - is the action succesful
	 * @param {number}  msg.actionId        - gift action unique identifier
	 * @param {boolean} msg.automaticAction - deprecated and not used anymore
	 */
	window.dofus.connectionManager.on('StartupActionFinishedMessage', function (msg) {
		if (!msg.success) {
			window.gui.openSimplePopup(
				getText('tablet.gift.unableToAssign'),
				getText('tablet.gift.unableToAssignTitle')
			);
		}
		if (!self._assigningGifts[msg.actionId]) { // first message (gift actionId was not in the map)
			self._assigningGifts[msg.actionId] = msg.success;
			self.emit('giftAssignRequestResult', msg);
		} else { // second message (gift actionId was in the map)
			self._assigningGifts[msg.actionId] = false;
			// self.emit('giftAssigned', msg); // nobody wants to listen that (for the time being)
		}
	});
};

/**
 * @param {object} msg - msg from StartupActionsListMessage
 * @param {function} cb
 * @private
 */
Gifts.prototype._createGiftList = function (msg, cb) {
	var self = this;

	var gifts = msg.actions;

	// create the items list

	var allItemsData = [];

	for (var i = 0, len = gifts.length; i < len; i += 1) {
		var gift = gifts[i];
		var items = gift.items;

		for (var j = 0, lenj = items.length; j < lenj; j += 1) {
			var item = items[j];
			if (!item) {
				continue;
			}
			allItemsData.push(item);
		}
	}

	// create items data with these ids

	itemManager.createItemInstances(allItemsData, function (error, instances) {
		if (error) {
			return cb(error);
		}

		// create the gift list

		for (var i = 0, len = gifts.length; i < len; i += 1) {
			var gift = gifts[i];

			// gathering the items list

			var itemDataList = [];
			var items = gift.items;

			for (var j = 0, lenj = items.length; j < lenj; j += 1) {
				var itemData = instances.array[i + j] || null;
				if (!itemData) {
					continue;
				}
				itemDataList.push(itemData);
			}

			if (!itemDataList.length) {
				continue;
			}

			self._giftList.push({
				uid: gift.uid,
				title: gift.title,
				text: gift.text,
				items: itemDataList
			});
		}

		cb();
	});
};

Gifts.prototype._reset = function () {
	this._characterList = [];
	this._charaListMinusDeadPeople = [];
	this._giftList = [];
	this._assigningGifts = {};
};

// public side

/**
 * Give the character list including the dead ones
 * @return {Array}
 */
Gifts.prototype.getCharacterList = function () {
	return this._characterList;
};

/**
 * Give list of characters without hte dead ones
 * @return {Array}
 */
Gifts.prototype.getCharaListMinusDeadPeople = function () {
	return this._charaListMinusDeadPeople;
};

/**
 * Set the list of characters and create new one without the dead characters
 * @param {array} characterList
 */
Gifts.prototype.setCharacterList = function (characterList) {
	this._characterList = characterList;
	this._charaListMinusDeadPeople = [];

	for (var i = 0, len = characterList.length; i < len; i += 1) {
		var character = characterList[i];

		// remove dead people

		if (!character.deathState || character.deathState === 0) {
			this._charaListMinusDeadPeople.push(character);
		}
	}
};

Gifts.prototype.assignGift = function (giftUid, characterId) {
	window.dofus.sendMessage('StartupActionsObjetAttributionMessage', {
		actionId: giftUid,
		characterId: characterId
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Gifts/index.js
 ** module id = 560
 ** module chunks = 0
 **/