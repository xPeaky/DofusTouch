var BasicBuff = require('./BasicBuff.js');
var inherits = require('util').inherits;
var ActionIdConverter = require('ActionIdConverter');
var FightEventsHelper = require('fightEventsHelper');
var FightEventEnum = require('FightEventEnum');

function StateBuff(effect, castingSpell, actionId, cb) {
	var self = this;
	BasicBuff.call(this, effect, castingSpell, actionId, effect.stateId, null, null, function (error, buff) {
		if (error) {
			return cb(error);
		}
		self.statName = ActionIdConverter.getActionStatName(actionId);
		self.stateId = effect.stateId;
		return cb(null, buff);
	});
}
inherits(StateBuff, BasicBuff);
module.exports = StateBuff;

StateBuff.prototype.apply = function () {
	var fighter = window.gui.fightManager.getFighter(this.targetId);
	if (!fighter) {
		return console.error('Applying state buff failed, fighter does not exist.');
	}
	fighter.addState(this.stateId);

	// TODO: we may emit a message at fightManager level instead
	window.gui.shortcutBar.updateSpellsAvailability();

	BasicBuff.prototype.apply.call(this);
};

StateBuff.prototype.remove = function () {
	if (!this._removed) {
		var fighter = window.gui.fightManager.getFighter(this.targetId);
		if (!fighter) {
			return console.error('Removing state buff failed, fighter does not exist.');
		}
		fighter.removeState(this.stateId);

		// TODO: we may emit a message at fightManager level instead
		window.gui.shortcutBar.updateSpellsAvailability();

		var targetId = this.targetId;
		if (window.gui.fightManager.deadTurnsList.indexOf(targetId) === -1) { // COMPAT226 isSilent
			if (this.actionId === 952) { // COMPAT226 952 = ActionIdConverter.ACTION_FIGHT_DISABLE_STATE
				FightEventsHelper.send(FightEventEnum.FIGHTER_ENTERING_STATE, [targetId, this.stateId], targetId, -1);
			} else {
				FightEventsHelper.send(FightEventEnum.FIGHTER_LEAVING_STATE, [targetId, this.stateId], targetId, -1);
			}
		}
	}

	BasicBuff.prototype.remove.call(this);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Buff/StateBuff.js
 ** module id = 230
 ** module chunks = 0
 **/