var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var util = require('util');

function GiftItemCriterion(criterionString) {
	Criterion.call(this, criterionString);

	var arrayParams = this.key.split(',');
	if (arrayParams.length > 1) {
		this._giftId = parseInt(arrayParams[0], 10);
		this._giftLevel = parseInt(arrayParams[1], 10);
	} else {
		this._giftId = parseInt(this.value, 10);
		this._giftLevel = -1;
	}
}
util.inherits(GiftItemCriterion, Criterion);

GiftItemCriterion.prototype.getText = function () {
	var alignmentGiftData = window.gui.databases.AlignmentGift;
	var giftName = alignmentGiftData[this._giftId] ? alignmentGiftData[this._giftId].nameId : '';
	if (this.operator === Criterion.operators.superior) {
		return getText('ui.pvp.giftRequired', [giftName + ' > ' + this._giftLevel]);
	} else {
		return getText('ui.pvp.giftRequired', [giftName]);
	}
};

GiftItemCriterion.prototype.isRespected = function () {
	var rank = window.gui.playerData.alignmentRank;
	var rankGift = window.gui.databases.AlignmentRankJntGift[rank];

	if (!rankGift || !rankGift.gifts) {
		return false;
	}

	for (var i = 0, len = rankGift.gifts.length; i < len; i += 1) {
		if (rankGift.gifts[i] === this._giftId) {
			if (this._giftLevel) {
				return rankGift.levels[i] > this._giftLevel;
			} else {
				return true;
			}
		}
	}

	return false;
};
module.exports = GiftItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/GiftItemCriterion.js
 ** module id = 356
 ** module chunks = 0
 **/