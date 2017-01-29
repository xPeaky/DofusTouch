var inherit = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var userPref = require('UserPreferences');

var NAME_PREFIX = 'option-';


function GameOptions() {
	EventEmitter.call(this);
	this.optionDefs = null;
}
inherit(GameOptions, EventEmitter);

module.exports = new GameOptions();


GameOptions.prototype.initialize = function (gui) {
	this.optionDefs = {
		showAllMonsters: { init: true },
		maxActorsBeforeCreatureMode: {
			init: 9999, onChange: window.actorManager.onMaxActorsBeforeCreatureModeChange.bind(window.actorManager)
		},
		hideDeadFighters: { init: true },
		allowSpellEffects: { init: true },
		autoGpsFlags: { init: true },
		autoGpsPhoenixes: { init: true, onChange: function () { gui.compass.updateMarkersPositions(); } },
		menubarSize: { init: gui.ipadRatio ? 6 : 3 },
		menubarSizeInFight: { init: gui.ipadRatio ? 3 : 2 },
		toolbarThicknessInFight: { init: 1 }, // only used in narrow res.
		tutorialTips: { init: true },
		soundOnPlayerTurnStart: { init: true },
		alwaysShowGrid: { init: false, onChange: window.isoEngine.toggleGrid.bind(window.isoEngine) },
		spellTooltipName: { init: true },
		spellTooltipApRange: { init: true },
		spellTooltipCritical: { init: false },
		spellTooltipEffect: { init: false },
		spellTooltipDescription: { init: true },
		confirmBoxWhenDragCasting: { init: true },
		confirmBoxWhenClickCasting: { init: true },
		confirmBoxWhenWalking: { init: true },
		showSpeechBubbleInFight: { init: true },
		orderFighters: { init: false },
		showApMpUsed: { init: false }
	};

	this._loadAllOptions();
};

GameOptions.prototype._loadAllOptions = function () {
	for (var opName in this.optionDefs) {
		var opData = this.optionDefs[opName];
		this[opName] = userPref.getValue(NAME_PREFIX + opName, opData.init);
	}
};

GameOptions.prototype.changeValue = function (name, value) {
	var oldValue = this[name];
	this[name] = value;

	userPref.setValue(NAME_PREFIX + name, value);

	var opData = this.optionDefs[name];
	if (opData.onChange) { opData.onChange(value, oldValue); }

	this.emit(name, value, oldValue);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/gameOptions/index.js
 ** module id = 25
 ** module chunks = 0
 **/