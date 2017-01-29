var Criterion = require('./Criterion.js');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var staticContent = require('staticContent');

function ServerItemCriterion(criterionString) {
	Criterion.call(this, criterionString);

	this._keyText = getText('ui.header.server');
}
inherits(ServerItemCriterion, Criterion);

ServerItemCriterion.prototype.initialize = function (cb) {
	var self = this;
	this._serverName = '';

	staticContent.getData('Servers', this.value, function (error, res) {
		if (error) {
			return cb(error);
		}

		self._serverName = res.nameId;
		cb();
	});
};

ServerItemCriterion.prototype.getKeyText = function () {
	return this._keyText;
};

ServerItemCriterion.prototype.getValueText = function () {
	return this._serverName;
};

ServerItemCriterion.prototype.getCriterion = function () {
	return window.gui.serversData.connectedServerId;
};

module.exports = ServerItemCriterion;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/criterionFactory/ServerItemCriterion.js
 ** module id = 375
 ** module chunks = 0
 **/