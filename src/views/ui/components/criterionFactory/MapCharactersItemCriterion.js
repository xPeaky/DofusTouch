var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

/**
 * Condition on the number of characters on a map
 */
function MapCharactersItemCriterion(criterionString) {
	Criterion.call(this, criterionString);

	var params = this.rawValue.split(',');
	if (params.length > 1) {
		this._mapId = parseInt(params[0], 10);
		this.value = parseInt(params[1], 10);
	} else {
		this._mapId = window.gui.playerData.position.mapId;
	}
}
inherits(MapCharactersItemCriterion, Criterion);

MapCharactersItemCriterion.prototype.getKeyText = function () {
	return getText('ui.criterion.MK', [this._mapId]);
};

// TODO this should return the number of character on the map this._mapId but
// this is what is returned in their code.. so in the mean time..
MapCharactersItemCriterion.prototype.getCriterion = function () {
	return window.gui.playerData.characterBaseInformations.level;
};

module.exports = MapCharactersItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/MapCharactersItemCriterion.js
 ** module id = 363
 ** module chunks = 0
 **/