require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var Button = require('Button');
var Table = require('Table');
var windowsManager = require('windowsManager');
var getText = require('getText').getText;
var playUiSound = require('audioManager').playUiSound;
var keyboard = require('keyboard');
var NumberInputBox = require('NumberInputBox');

var characCodes = {
	vitality: 11,
	wisdom: 12,
	strength: 10,
	intelligence: 15,
	chance: 13,
	agility: 14
};

//Index of values in cost step array
var LEVEL = 0, COST = 1;


function CharacUpdateWindow() {
	Window.call(this, {
		className: 'characUpdateWindow',
		title: 'Characteristic Update',
		positionInfo: { top: 'c', left: 'c', width: 410, height: 300 }
	});

	this.on('open', function (params) {
		// move this window next to Characteristics window
		var characteristics = windowsManager.getWindow('characteristics');
		if (!characteristics.openState) { return; } // should not happen but...
		windowsManager.arrangeOpeningWindow(this.id, { rightOf: characteristics.id });

		this.updateContent(params);
	});

	this.on('close', function () {
		keyboard.hide();
	});

	this.closeButton.on('tap', function () {
		playUiSound('CANCEL_BUTTON');
	});
}
inherits(CharacUpdateWindow, Window);
module.exports = CharacUpdateWindow;

CharacUpdateWindow.prototype.updateContent = function (params) {
	var self = this;

	this.pointsRemaining = params.pointsRemaining;
	this.initialLevel = params.initialLevel;
	this.characteristicName = params.characteristicName;
	this.costSteps = params.costSteps;
	this.pointsSpent = this.addedLevel = 0;

	this.findCurrentCostStep();

	this.windowTitle.setText(params.label);
	this.windowBody.clearContent();

	var pointsRemainingLine = this.windowBody.createChild('div', { className: 'points' });
	pointsRemainingLine.createChild('span',
		{ text: getText('ui.charaSheet.boostPoints') + getText('ui.common.colon') });
	this.pointsRemainingElt = pointsRemainingLine.createChild('span',
		{ className: 'pointsRemaining', text: this.pointsRemaining });

	this.container = this.windowBody.createChild('div', { className: 'containerBlock' });

	var additionBlock = this.container.createChild('div', { className: 'additionBlock' });

	additionBlock.appendChild(new Button({ className: 'minusButton', repeatDelay: 50, scaleOnPress: true }, function () {
		if (self.updatePoints(-1)) { self.displayValues(); }
	}));

	this.pointsLineAdded = new NumberInputBox({ className: 'pointsInput', minValue: 0, maxValue: this.pointsRemaining });

	this.pointsLineAdded.on('change', function (value) {
		self.updatePointsUntil(value);
	});

	additionBlock.appendChild(this.pointsLineAdded);

	additionBlock.appendChild(new Button({ className: 'plusButton', repeatDelay: 50, scaleOnPress: true }, function () {
		if (self.updatePoints(+1)) { self.displayValues(); }
	}));

	var additionLine = additionBlock.createChild('div', { className: 'additionLine' });
	additionLine.createChild('span', { text: '+ ' });
	this.levelAddedElt = additionLine.createChild('span', { text: 0 });
	additionLine.createChild('span', { text: ' ' + params.label });


	var totalLine = additionBlock.createChild('div', { className: 'totalLine' });
	this.finalLevelElt = totalLine.createChild('span', { text: this.initialLevel });
	totalLine.createChild('span', { text: ' ' + params.label });

	this.createCostLevelTable();

	this.container.appendChild(new Button({ text: getText('ui.common.validation'), className: 'button' }, function () {
		//ignore the confirm button tap if 0 (the <= test is just in case; it should never be <0)
		if (self.pointsSpent <= 0) { return playUiSound('GEN_BUTTON'); }
		playUiSound('OK_BUTTON');
		var statId = characCodes[self.characteristicName];
		window.dofus.sendMessage('StatsUpgradeRequestMessage', {
			statId: statId,
			boostPoint: self.pointsSpent
		});
		windowsManager.close(self.id);
	}));

	this.displayValues();
};

CharacUpdateWindow.prototype.createCostLevelTable = function () {
	var ids = ['title'];
	var levelData = ['Level'];
	var costData = ['Cost'];
	var steps = this.costSteps;
	for (var i = 0; i < steps.length; i++) {
		ids.push('l' + i);
		levelData.push('> ' + steps[i][LEVEL]);
		costData.push(steps[i][COST]);
	}
	this.table = this.container.appendChild(new Table({
		colIds: ids,
		colCount: steps.length,
		headerContent: levelData
	}));
	this.costRow = this.table.addRow(costData);
};

CharacUpdateWindow.prototype.displayValues = function () {
	this.pointsRemainingElt.setText(this.pointsRemaining - this.pointsSpent);
	this.pointsLineAdded.setValue(this.pointsSpent);
	this.levelAddedElt.setText(this.addedLevel);
	this.finalLevelElt.setText(this.initialLevel + this.addedLevel);

	//move selected cost step highlight
	if (this.currentCostStep !== this.previousCostStep) {
		if (this.previousCostStep !== undefined) {
			var previousLevelCell = this.table.getHeaderCol('l' + this.previousCostStep);
			var previousCostCell = this.table.getCol(0, 'l' + this.previousCostStep);
			previousLevelCell.delClassNames('selected');
			previousCostCell.delClassNames('selected');
		}
		this.previousCostStep = this.currentCostStep;

		var levelCell = this.table.getHeaderCol('l' + this.currentCostStep);
		var costCell = this.table.getCol(0, 'l' + this.currentCostStep);
		levelCell.addClassNames('selected');
		costCell.addClassNames('selected');
	}
};

CharacUpdateWindow.prototype.findCurrentCostStep = function () {
	var steps = this.costSteps;
	this.previousCostStep = undefined;
	this.currentCostStep = 0;
	for (var i = 0; i < steps.length; i++) {
		if (this.initialLevel >= steps[i][LEVEL]) { this.currentCostStep = i; }
	}
};

CharacUpdateWindow.prototype.updatePointsUntil = function (pointsSpentGoal) {
	if (pointsSpentGoal - this.pointsSpent > 0) {
		while (this.pointsSpent < pointsSpentGoal) {
			var currentCost = this.costSteps[this.currentCostStep][COST];
			if (this.pointsSpent + currentCost > pointsSpentGoal) { break; } //one more level would be over goal
			if (!this.updatePoints(+1)) { break; } //reached limit of how much we can spend
		}
	} else {
		while (this.pointsSpent > pointsSpentGoal) {
			if (!this.updatePoints(-1)) { break; } //reached 0
		}
	}
	this.displayValues();
};

/** this.currentCostStep indicates the cost to next "+1" operation (not the cost of the last +1) */
CharacUpdateWindow.prototype.updatePoints = function (increment) {
	var curStep = this.costSteps[this.currentCostStep];
	var currentCost = curStep[COST];
	if (increment > 0) {
		if (this.pointsSpent + currentCost > this.pointsRemaining) { return false; } //cannot afford

		this.pointsSpent += currentCost;
		this.addedLevel++;

		var nextStep = this.costSteps[this.currentCostStep + 1];
		if (nextStep && this.initialLevel + this.addedLevel >= nextStep[LEVEL]) {
			this.currentCostStep++;
		}
	} else {
		if (!this.pointsSpent) { return false; } //already 0

		if (this.initialLevel + this.addedLevel <= curStep[LEVEL]) {
			this.currentCostStep--;
			curStep = this.costSteps[this.currentCostStep];
			currentCost = curStep[COST];
		}

		this.pointsSpent -= currentCost;
		this.addedLevel--;
	}
	return true;
};

module.exports.getStatCost = function (costSteps, statBase) {
	var cost = 0;
	for (var i = costSteps.length - 1; i >= 0; i--) {
		if (statBase >= costSteps[i][LEVEL]) {
			return costSteps[i][COST];
		}
	}
	return cost;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CharacUpdateWindow/index.js
 ** module id = 686
 ** module chunks = 0
 **/