require('./waitingGauge.less');
var inherits = require('util').inherits;
var ProgressCircle = require('ProgressCircle');
var WuiDom = require('wuidom');

var GAUGE_SIZE = 70; // px
var GAUGE_THICKNESS = 7; // px

var GAUGE_COLOR = '#58b';
var GRAY_GAUGE_COLOR = '#555';


function WaitingGauge(options) {
	WuiDom.call(this, 'div', { className: ['waitingGauge', 'spinner'], hidden: true });

	options = options || {};

	var verticalCenterDiv = this.createChild('div', { className: 'verticalCenterDiv' });

	var gauge = this.gauge = verticalCenterDiv.createChild('div', { className: 'gauge' });
	this.progressCircle = gauge.appendChild(new ProgressCircle({
		size: options.size || GAUGE_SIZE,
		thickness: options.thickness || GAUGE_THICKNESS,
		color: options.color || GAUGE_COLOR,
		bgColor: options.bgColor || GRAY_GAUGE_COLOR
	}));

	this.valueElt = gauge.createChild('div', { className: 'value', text: '' });

	this.labelElt = verticalCenterDiv.createChild('div', { className: 'label', text: '' });
}
inherits(WaitingGauge, WuiDom);
module.exports = WaitingGauge;


WaitingGauge.prototype.setLabel = function (label) {
	this.labelElt.setText(label);
};

/**
 * Shows the waiting gauge or spinner.
 * @param {number} goal - the number of "tasks" to execute
 * @param {string} [label] - description of what we are waiting for
 * @param {number} [minGoalForGauge] - default is 1; if goal is < to this, only spinner is used
 */
WaitingGauge.prototype.showGauge = function (goal, label, minGoalForGauge) {
	this.goal = goal;
	minGoalForGauge = minGoalForGauge || 1;

	if (goal > minGoalForGauge) {
		this.progressCircle.setValue(0, 1);
		this.valueElt.setText('0%');
		this.labelElt.setText(label ? label : '');

		this.delClassNames('spinner');
		this.gauge.show();
		this.labelElt.show();
	} else {
		this.labelElt.hide();
	}
	this.show();
};

// value is a "countdown" from "goal" to 0; when 0 is reached we are done waiting.
WaitingGauge.prototype.refreshGauge = function (value) {
	if (this.gauge.isVisible()) {
		var percent = (this.goal - value) / this.goal;

		this.progressCircle.setValue(percent, 1);
		this.valueElt.setText(Math.round(percent * 100) + '%');
	}

	if (value === 0) {
		this.hideGauge();
	}
};

WaitingGauge.prototype.hideGauge = function () {
	this.goal = 0;
	this.addClassNames('spinner'); // restore basic spinner
	this.gauge.hide();
	this.hide();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/BreedingWindow/WaitingGauge.js
 ** module id = 682
 ** module chunks = 0
 **/