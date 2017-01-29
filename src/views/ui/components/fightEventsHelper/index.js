var FightEventEnum = require('FightEventEnum');
var GameActionFightInvisibilityStateEnum = require('GameActionFightInvisibilityStateEnum');
var FightSpellCastCriticalEnum = require('FightSpellCastCriticalEnum');
var staticContent = require('staticContent');
var gt = require('getText');
var getText = gt.getText;
var processTextWithModifier = gt.processTextWithModifier;
var async = require('async');
var channelsEnum = require('ChatActivableChannelsEnum');

var fightEvents = [];
var deadTargets = {};
var lifeLostTargets = {};
var isFlushing = false;
var flushStack = [];

var defaultCallback = function (error) {
	if (error) {
		return console.error(error);
	}
};

function createFightEvent(name, params, fighterId, castingSpellId, checkParams, firstParamToCheck) {
	if (checkParams === undefined) {
		checkParams = 0;
	}
	if (firstParamToCheck === undefined) {
		firstParamToCheck = 1;
	}

	return {
		name: name,
		targetId: fighterId,
		params: params,
		checkParams: checkParams,
		castingSpellId: castingSpellId,
		order: fightEvents.length,
		firstParamToCheck: firstParamToCheck
	};
}

function formatTextDamage(text, actionId) {
	var typeAction = window.gui.databases.TypeActions[actionId];
	var elementId = typeAction ? typeAction.elementId : -1;
	var damageType;
	text = '-' + text;
	switch (elementId) {
		case -1:
			damageType = 'multi';
			break;
		case 0:
			damageType = 'neutral';
			break;
		case 1:
			damageType = 'earth';
			break;
		case 2:
			damageType = 'fire';
			break;
		case 3:
			damageType = 'water';
			break;
		case 4:
			damageType = 'air';
			break;
	}
	// Mimics hyperlinks' syntax
	return damageType ? '{style:' + damageType + 'Damage,' + text + '}' : text;
}

function buildFightText(fightEvent, cb) {
	if (fightEvent.name === FightEventEnum.FIGHT_END) {
		return cb(null, getText('ui.fight.fightEnd'));
	}

	var text;
	var fightManager = window.gui.fightManager;
	var params = fightEvent.params;
	var spellState;
	var fighter = fightManager.getFighter(params[0]);
	if (!fighter) {
		return cb(new Error('Fighter does not exist.'));
	}
	var otherFighter;
	if (fightEvent.name === FightEventEnum.FIGHTER_DEATH) {
		// TODO: Handle teams ?
		// param 0 is male
		text = processTextWithModifier(getText('ui.fight.isDead'), 0, fighter.name);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_TRIGGERED_GLYPH) {
		// FIGHTER_TRIGGERED_TRAP same as FIGHTER_TRIGGERED_GLYPH
		otherFighter = fightManager.getFighter(params[1]);
		if (!otherFighter) {
			return cb(new Error('Second fighter does not exist.'));
		}
		return fightManager.getFighterSpell(params[2], params[1], function (error, spell) {
			if (error) {
				return cb(error);
			}
			text = getText('ui.fight.startTrap', fighter.name, spell.getName(), otherFighter.name);
			return cb(null, text);
		});
	} else if (fightEvent.name === FightEventEnum.FIGHTER_ENTERING_STATE) {
		var turnText = params[2] ? '</b> (' + params[2] + ')<b>' : '';
		spellState = window.gui.databases.SpellStates[params[1]];
		text = getText('ui.fight.enterState', fighter.name, spellState.nameId + turnText);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_LEAVING_STATE) {
		spellState = window.gui.databases.SpellStates[params[1]];
		text = getText('ui.fight.exitState', fighter.name, spellState.nameId);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_SPELL_DISPELLED) {
		return fightManager.getFighterSpell(params[1], params[0], function (error, spell) {
			if (error) {
				return cb(error);
			}
			text = getText('ui.fight.dispellSpell', fighter.name, spell.getName());
			return cb(null, text);
		});
	} else if (fightEvent.name === FightEventEnum.FIGHTER_CASTED_SPELL) {
		return fightManager.getFighterSpell(params[1], params[0], function (error, spell) {
			if (error) {
				return cb(error);
			}
			text = getText('ui.fight.launchSpell', fighter.name, spell.getName());
			if (params[2] === FightSpellCastCriticalEnum.CRITICAL_HIT) {
				text += ' ' + getText('ui.fight.criticalHit');
			} else if (params[2] === FightSpellCastCriticalEnum.CRITICAL_FAIL) {
				text += ' ' + getText('ui.fight.criticalMiss');
			}
			return cb(null, text);
		});
	} else if (fightEvent.name === FightEventEnum.FIGHTER_CLOSE_COMBAT) {
		return staticContent.getData('Items', [params[1]], function (error, items) {
			if (error) {
				return cb(error);
			}
			text = getText('ui.fight.closeCombat', fighter.name, items[0].nameId);
			if (params[2] === FightSpellCastCriticalEnum.CRITICAL_HIT) {
				text += ' ' + getText('ui.fight.criticalHit');
			} else if (params[2] === FightSpellCastCriticalEnum.CRITICAL_FAIL) {
				text += ' ' + getText('ui.fight.criticalMiss');
			}
			return cb(null, text);
		});
	} else if (fightEvent.name === FightEventEnum.FIGHTER_LIFE_LOSS_AND_DEATH) {
		text = getText('ui.fight.lifeLossAndDeath', fighter.name, formatTextDamage(params[1], params[2]));
	} else if (fightEvent.name === FightEventEnum.FIGHTER_LIFE_LOSS) {
		text = getText('ui.fight.lifeLoss', fighter.name, formatTextDamage(params[1], params[2]));
	} else if (fightEvent.name === FightEventEnum.FIGHTER_SHIELD_LOSS) {
		text = getText('ui.fight.lostShieldPoints', fighter.name, formatTextDamage(params[1], params[2]));
	} else if (fightEvent.name === FightEventEnum.FIGHTER_REDUCED_DAMAGES) {
		text = getText('ui.fight.reduceDamages', fighter.name, params[1]);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_LIFE_GAIN) {
		text = getText('ui.fight.lifeGain', fighter.name, params[1]);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_AP_LOST) {
		text = getText('ui.fight.lostAP', fighter.name, params[1]);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_AP_GAINED) {
		text = getText('ui.fight.winAP', fighter.name, params[1]);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_AP_LOSS_DODGED) {
		text = getText('ui.fight.dodgeAP', fighter.name, params[1]);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_MP_LOST) {
		text = getText('ui.fight.lostMP', fighter.name, params[1]);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_MP_GAINED) {
		text = getText('ui.fight.winMP', fighter.name, params[1]);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_MP_LOSS_DODGED) {
		text = getText('ui.fight.dodgeMP', fighter.name, params[1]);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_TEMPORARY_BOOSTED) {
		var duration = ~~params[2];
		text = getText('ui.fight.effect', fighter.name, duration ? params[1] + ' (' + params[3] + ')' : params[1]);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_EFFECTS_MODIFY_DURATION) {
		text = getText('ui.fight.effectsModifyDuration', fighter.name, params[2]);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_SPELL_IMMUNITY) {
		text = getText('ui.fight.noChange', fighter.name);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_NO_CHANGE) {
		text = getText('ui.fight.noChange', fighter.name);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_LEAVE) {
		text = getText('ui.fight.leave', fighter.name);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_GOT_DISPELLED) {
		text = getText('ui.fight.dispell', fighter.name);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_REFLECTED_SPELL) {
		text = getText('ui.fight.reflectSpell', fighter.name);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_REFLECTED_DAMAGES) {
		text = getText('ui.fight.reflectDamages', fighter.name);
	} else if (fightEvent.name === FightEventEnum.FIGHTER_GOT_TACKLED) {
		// TODO: fighterGotTackled - AP & MP lost does not seem to be added?
		text = getText('ui.fight.dodgeFailed');
	} else if (fightEvent.name === FightEventEnum.FIGHTER_VISIBILITY_CHANGED) {
		var isInvisible = params[1] === GameActionFightInvisibilityStateEnum.INVISIBLE;
		if (isInvisible) {
			text = getText('ui.fight.invisibility', fighter.name);
		} else {
			text = getText('ui.fight.visibility', fighter.name);
		}
	} else if (fightEvent.name === FightEventEnum.FIGHTER_GOT_KILLED) {
		otherFighter = fightManager.getFighter(params[1]);
		if (!otherFighter) {
			return cb(new Error('Second fighter does not exist.'));
		}
		if (params[0] === params[1]) {
			return cb();
		}
		text = getText('ui.fight.killed', fighter.name, otherFighter.name);
	}
	return cb(null, text);
}

function _send(fightEvent, cb) {
	if (!cb) {
		cb = defaultCallback;
	}

	window.gui.fightManager.emit(fightEvent.name, fightEvent.params);

	if (fightEvent.name === FightEventEnum.FIGHTER_LIFE_LOSS && deadTargets[fightEvent.params[0]]) {
		fightEvent.name = FightEventEnum.FIGHTER_LIFE_LOSS_AND_DEATH;
	} else if (fightEvent.name === FightEventEnum.FIGHTER_DEATH && lifeLostTargets[fightEvent.params[0]]) {
		return cb();
	}

	buildFightText(fightEvent, function (error, text) {
		if (error) {
			return cb(error);
		} else if (!text) {
			return cb();
		}
		window.gui.chat.logMsg(text, channelsEnum.PSEUDO_CHANNEL_FIGHT_LOG);
		return cb();
	});
}

function send(name, params, fighterId, castingSpellId, checkParams, firstParamToCheck) {
	var fightEvent = createFightEvent(name, params, fighterId, castingSpellId, checkParams, firstParamToCheck);
	_send(fightEvent);
}
exports.send = send;

function push(name, params, fighterId, castingSpellId, checkParams, firstParamToCheck) {
	var fightEvent = createFightEvent(name, params, fighterId, castingSpellId, checkParams, firstParamToCheck);
	if (fightEvent.name === FightEventEnum.FIGHTER_LIFE_LOSS) {
		lifeLostTargets[fightEvent.params[0]] = true;
	} else if (fightEvent.name === FightEventEnum.FIGHTER_DEATH) {
		deadTargets[fightEvent.params[0]] = true;
	}
	fightEvents.push(fightEvent);
}
exports.push = push;

function reset() {
	fightEvents = [];
	deadTargets = {};
	lifeLostTargets = {};
	isFlushing = false;
	flushStack = [];
}
exports.reset = reset;

function sendGroupedEvents(groupedEvents, cb) {
	isFlushing = true;

	if (!cb) {
		cb = defaultCallback;
	}

	// TODO: Process and compress events
	async.eachSeries(groupedEvents, function (fightEvent, callback) {
		_send(fightEvent, callback);
	}, function done(error) {
		isFlushing = false;
		deadTargets = {};
		lifeLostTargets = {};
		if (error) {
			return cb(error);
		}
		cb();

		if (flushStack.length) {
			var nextFlush = flushStack.shift();
			return sendGroupedEvents(nextFlush[0], nextFlush[1]);
		}
	});
}

function flush(cb) {
	var groupedEvents = fightEvents;
	fightEvents = [];

	if (isFlushing) {
		return flushStack.push([groupedEvents, cb]);
	}

	sendGroupedEvents(groupedEvents, cb);
}
exports.flush = flush;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/fightEventsHelper/index.js
 ** module id = 231
 ** module chunks = 0
 **/