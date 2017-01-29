require('./styles.less');
var inherits = require('util').inherits;
var getText = require('getText').getText;
var WuiDom = require('wuidom');
var Button = require('Button');


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class  FightControlButtons
 * @desc   buttons displayed in the medaillon during fight
 */
function FightControlButtons() {
	WuiDom.call(this, 'div', { className: 'fightControlButtons' });
	var self = this;

	// Fight ready button
	this._isReadyForFight = false;
	var fightReadyBtn = this._fightReadyBtn = new Button(
		{ text: getText('ui.banner.ready'), className: 'fightBtn', hidden: true, scaleOnPress: true },
		function () {
			self.toggleReadyForFight();
		}
	);
	this.appendChild(fightReadyBtn);

	// Turn ready button (= "End turn")
	var turnReadyBtn = this._turnReadyBtn = new Button(
		{ text: getText('tablet.fight.option.nextTurn'), className: 'fightBtn', hidden: true, scaleOnPress: true },
		function () {
			window.dofus.sendMessage('GameFightTurnFinishMessage');
			endTurn();
		}
	);
	this.appendChild(turnReadyBtn);


	function prepareFight(isReady) {
		fightReadyBtn.show();

		self._isReadyForFight = isReady;
		if (isReady) {
			fightReadyBtn.addClassNames('readyForFight');
		} else {
			fightReadyBtn.delClassNames('readyForFight');
		}
	}

	function startFight() {
		fightReadyBtn.hide();

		self.setTurnReadyButtonAvailability(false);
		turnReadyBtn.show();
	}

	function startTurn(msg) {
		// Ignore this event for other characters' turn start
		if (msg && !window.gui.playerData.characters.canControlCharacterId(msg.id)) { return; }

		self.setTurnReadyButtonAvailability(true);
	}

	function endTurn() {
		self.setTurnReadyButtonAvailability(false);
	}

	function endFight() {
		turnReadyBtn.hide();
	}


	window.gui.on('GameFightJoinMessage', function (msg) {
		if (!msg.canSayReady) { return; }
		prepareFight(false);
	});

	window.gui.fightManager.on('playerReady', prepareFight);

	window.gui.on('GameFightStartMessage', startFight);
	window.gui.on('GameFightResumeMessage', startFight);
	window.gui.on('GameFightResumeWithSlavesMessage', startFight);

	window.gui.on('GameFightTurnStartPlayingMessage', function () { startTurn(null); }); // COMPAT: not yet sent in 2.14

	// COMPAT: remove this event listener when get back in 2.19
	window.gui.on('GameFightTurnStartMessage', startTurn);

	window.gui.on('GameFightTurnStartSlaveMessage', startTurn);
	window.gui.on('GameFightTurnResumeMessage', startTurn);

	window.gui.on('GameFightTurnEndMessage', endTurn);

	window.gui.on('GameFightEndMessage', endFight);
	window.gui.on('disconnect', endFight);
}

inherits(FightControlButtons, WuiDom);
module.exports = FightControlButtons;


FightControlButtons.prototype.toggleReadyForFight = function () {
	window.dofus.sendMessage('GameFightReadyMessage', { isReady: !this._isReadyForFight });
};

FightControlButtons.prototype.isReadyForFightButtonVisible = function () {
	return this._fightReadyBtn.isVisible();
};

FightControlButtons.prototype.setTurnReadyButtonAvailability = function (shouldEnable) {
	var btn = this._turnReadyBtn;
	if (shouldEnable) {
		btn.enable();
	} else {
		btn.disable();
	}
};

/**
 * Reserved for tutorial
 * @param {string} btnName - can be 'fightReadyBtn' or 'turnReadyBtn'
 * @return {rect|null} - button's rectangle if it exists and is visible; null otherwise
 */
FightControlButtons.prototype.getButtonRectForTuto = function (btnName) {
	var btn;
	switch (btnName) {
	case 'fightReadyBtn':
		btn = this._fightReadyBtn;
		break;
	case 'turnReadyBtn':
		btn = this._turnReadyBtn;
		break;
	default:
		return null;
	}
	if (!btn.isVisible()) { return null; }
	return btn.rootElement.getBoundingClientRect();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/FightControlButtons/index.js
 ** module id = 580
 ** module chunks = 0
 **/