var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var staticContent = require('staticContent');
var inherits = require('util').inherits;

var emotesCachedData = {}; // caching emotes data

function EmoteItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(EmoteItemCriterion, Criterion);

EmoteItemCriterion.prototype.initialize = function (cb) {
	var emoteId = this.value;

	var emoteData = emotesCachedData[emoteId]; // did we already retrieve this emote
	if (emoteData) {
		this._emoticonData = emoteData;
		return cb();
	}

	// is it already in the emoteData list (the one the player possesses)
	emoteData = window.gui.playerData.emoteData.list[emoteId];
	if (emoteData) {
		this._emoticonData = emoteData;
		return cb();
	}

	var self = this; // let's retrieve it
	staticContent.getData('Emoticons', this.value, function (error, res) {
		if (error) {
			return cb(error);
		}

		emotesCachedData[res.id] = res;
		self._emoticonData = res;
		cb();
	});
};

EmoteItemCriterion.prototype.isRespected = function () {
	return window.gui.playerData.emoteData.list.hasOwnProperty(this.value);
};

EmoteItemCriterion.prototype.getText = function () {
	var readableCriterion = this.operator === Criterion.operators.different ?
		getText('ui.tooltip.dontPossessEmote') : getText('ui.tooltip.possessEmote');
	return readableCriterion + ' \'' + this._emoticonData.nameId + '\'';
};

module.exports = EmoteItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/EmoteItemCriterion.js
 ** module id = 354
 ** module chunks = 0
 **/