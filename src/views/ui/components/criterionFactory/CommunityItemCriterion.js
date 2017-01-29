var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;

function CommunityItemCriterion(criterionString) {
	Criterion.call(this, criterionString);

	this._communityId = window.gui.playerData.identification.communityId;
}
inherits(CommunityItemCriterion, Criterion);

CommunityItemCriterion.prototype.initialize = function (cb) {
	var self = this;
	var serverData = window.gui.serversData;

	serverData.syncServerStaticData(function (error) {
		if (error) {
			console.error('ServerDetails setServer error', error);
			return cb(error);
		}

		self._communityName = serverData.staticContent.communities[self._communityId];
		cb();
	});
};

CommunityItemCriterion.prototype.getText = function () {
	if (this.operator === Criterion.operators.equal) {
		return getText('ui.criterion.community', [this._communityName]);
	} else {
		return getText('ui.criterion.notCommunity', [this._communityName]);
	}
};

CommunityItemCriterion.prototype.getCriterion = function () {
	return this._communityId;
};

module.exports = CommunityItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/CommunityItemCriterion.js
 ** module id = 352
 ** module chunks = 0
 **/