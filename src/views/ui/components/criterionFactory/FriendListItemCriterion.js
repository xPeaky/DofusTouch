var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var util = require('util');

function FriendListItemCriterion(criterionString) {
	Criterion.call(this, criterionString);
}
util.inherits(FriendListItemCriterion, Criterion);

FriendListItemCriterion.prototype.getKeyText = function () {
	return getText('ui.tooltip.playerInFriendlist');
};

FriendListItemCriterion.prototype.getCriterion = function () {
	return Object.keys(window.gui.playerData.socialData.friendsList).length;
};

module.exports = FriendListItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/FriendListItemCriterion.js
 ** module id = 355
 ** module chunks = 0
 **/