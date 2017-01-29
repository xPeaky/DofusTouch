var AggressableStatusEnum = require('AggressableStatusEnum');
var entityManager = require('socialEntityManager');
var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var PrismStateEnum = require('PrismStateEnum');
var inherits = require('util').inherits;

function AllianceAvAItemCriterion(criterionString) {
	Criterion.call(this, criterionString);

	if (this.operator === Criterion.operators.equal) {
		this._text = getText('ui.criterion.allianceAvA');
	} else {
		this._text = '';
	}
}
inherits(AllianceAvAItemCriterion, Criterion);

AllianceAvAItemCriterion.prototype.getText = function () {
	return this._text;
};

AllianceAvAItemCriterion.prototype.isRespected = function () {
	// need to disable one rule because of the name the enum 'AvA_ENABLED_AGGRESSABLE' and 'AvA_PREQUALIFIED_AGGRESSABLE'
	//jscs:disable requireCamelCaseOrUpperCaseIdentifiers
	if (this.operator !== Criterion.operators.equal) {
		return false;
	}

	var playerData = window.gui.playerData;

	var aggressable = playerData.characters.mainCharacter.characteristics.alignmentInfos.aggressable;
	if (aggressable !== AggressableStatusEnum.AvA_ENABLED_AGGRESSABLE &&
		aggressable !== AggressableStatusEnum.AvA_PREQUALIFIED_AGGRESSABLE) {
		return false;
	}

	var currentPrism = entityManager.entities.prism[playerData.position.subAreaId];
	if (!currentPrism || currentPrism.mapId === -1) {
		return false;
	}

	if (currentPrism.state !== PrismStateEnum.PRISM_STATE_VULNERABLE) {
		return false;
	}

	return true;
};

module.exports = AllianceAvAItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/AllianceAvAItemCriterion.js
 ** module id = 333
 ** module chunks = 0
 **/