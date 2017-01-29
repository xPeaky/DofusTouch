var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var staticContent = require('staticContent');

var SOUL_STONE_GIDS = [7010, 10417, 10418];

function SoulStoneItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
inherits(SoulStoneItemCriterion, Criterion);

SoulStoneItemCriterion.prototype.initialize = function (cb) {
	var monsterId;

	var arrayParams = this.key.split(',');
	if (arrayParams.length > 1) {
		monsterId = parseInt(arrayParams[0], 10);
		this._quantityMonster = parseInt(arrayParams[1], 10);
	} else {
		monsterId = parseInt(this.value, 10);
		this._quantityMonster = 1;
	}

	this._monsterName = '';
	var self = this;
	staticContent.getData('Monsters', monsterId, function (error, res) {
		if (error) {
			return cb(error);
		}

		self._monsterName =  res.nameId;
		cb();
	});
};

SoulStoneItemCriterion.prototype.isRespected = function () {
	var inventory = window.gui.playerData.inventory;
	for (var i = 0; i < SOUL_STONE_GIDS.length; i += 1) {
		if (inventory.quantityList[[SOUL_STONE_GIDS]]) {
			return true;
		}
	}

	return false;
};

SoulStoneItemCriterion.prototype.getText = function () {
	return getText('ui.tooltip.possessSoulStone', [this._quantityMonster, this._monsterName]);
};

module.exports = SoulStoneItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/SoulStoneItemCriterion.js
 ** module id = 377
 ** module chunks = 0
 **/