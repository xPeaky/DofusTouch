require('./styles.less');
var inherits             = require('util').inherits;
var gameOptions          = require('gameOptions');
var WuiDom               = require('wuidom');
var gripBehavior         = require('gripBehavior');
var FightControlButtons  = require('FightControlButtons');
var FightBuffs           = require('FightBuffs');
var addTooltip           = require('TooltipBox').addTooltip;
var getText              = require('getText').getText;
var FightEventEnum       = require('FightEventEnum');
var Scroller             = require('Scroller');
var tweener              = require('tweener');
var dragManager          = require('dragManager');
var GameActionFightInvisibilityStateEnum = require('GameActionFightInvisibilityStateEnum');

var FIGHTER_WIDTH = 55;
var FIGHTER_WIDTH_SUMMON = 45;
var maxWidth = 0;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Turn list displayed durring fight.  */
function Timeline() {
	WuiDom.call(this, 'div', { className: 'Timeline', hidden: true });

	this._createContent();

	this.statsDetails = null;

	this.currentFighter = null;
	this.selectedFighter = null;

	this.selectedSpell = null;

	this.isCollapsed = false;

	this._registerListeners(window.gui);

	this.timerTimestamp = null;
	this.timerDuration = null;
	this.timerTween = null;
	this._previousFighter = null;
}
inherits(Timeline, WuiDom);
module.exports = Timeline;


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set listeners for this component
 *  @private
 *
 *  @param {Object} gui - object on which event are registered to.
 */
Timeline.prototype._registerListeners = function (gui) {
	var self = this;
	var fightManager = gui.fightManager;

	fightManager.on('GameFightTurnEnd', function (id) {
		// TODO: Modify according to Timeline.as, onGameFightTurnEnd
		var fighter = this.getFighter(id);
		if (!fighter || !fighter.data.alive) {
			return;
		}
		self.unsetTurnOf(fighter);
	});

	fightManager.on('FightersListUpdated', function () {
		self.refreshTimeline();
	});

	fightManager.on('UpdatePreFightersList', function () {
		// TODO: Modify according to Timeline.as, onUpdatePreFightersList
		self.refreshTimeline();
	});

	fightManager.on('GameFightTurnStart', function (id, waitTime) {
		var fighter = this.getFighter(id);
		if (!fighter) {
			// TODO: Modify according to Timeline.as, onGameFightTurnStart
			return;
		}

		if (!fighter.data.alive) {
			return;
		}

		self.setTurnOf(fighter, waitTime);
	});

	function processFightEvent(params, targetList, process) {
		if (!targetList) {
			targetList = [];
			if (params.length > 0) {
				targetList.push(params[0]);
			}
		}
		var fighters = fightManager.getAvailableFighters();
		for (var i = 0, len = targetList.length; i < len; i++) {
			var targetId = targetList[i];
			var fighter = fighters[targetId];
			if (!fighter) {
				continue;
			}
			process(fighter);
		}
	}

	function fighterDiedOrLeft(params, targetList) {
		processFightEvent(params, targetList, function (fighter) {
			self.unsetTurnOf(fighter);
			self.onOrderFightersSwitched();
			if (gameOptions.hideDeadFighters) { self.refreshTimeline(); }
		});
	}

	fightManager.on(FightEventEnum.FIGHTER_DEATH, fighterDiedOrLeft);
	fightManager.on(FightEventEnum.FIGHTER_LEAVE, fighterDiedOrLeft);

	fightManager.on('FoldAll', function (/*fold*/) {
		// TODO: Hide/show
	});

	function refreshPictoBar(fighter) {
		fighter.refreshHP();
		fighter.refreshShield();
	}

	fightManager.on('BuffAdd', function (buff, fighter) {
		refreshPictoBar(fighter);
		self._refreshAfterResize();
	});

	fightManager.on('BuffDispell', function (fighter) {
		refreshPictoBar(fighter);
	});

	fightManager.on('BuffRemove', function (buff, fighter) {
		refreshPictoBar(fighter);
		self._refreshAfterResize();
	});

	fightManager.on('BuffUpdate', function (buff, fighter) {
		refreshPictoBar(fighter);
	});

	fightManager.on('TurnCountUpdated', function (turnCount) {
		self.turnCountLabel.setText(getText('ui.fight.turnNumber', turnCount + 1));
	});

	fightManager.on('OrderFightersSwitched', function () {
		self.onOrderFightersSwitched();
	});

	gameOptions.on('hideDeadFighters', function (/*value*/) {
		self.refreshTimeline();
	});

	gameOptions.on('orderFighters', function (value) {
		var fighters = fightManager.getAvailableFighters();
		for (var fighterId in fighters) {
			fighters[fighterId].picto.fighterNumber.toggleDisplay(value);
		}
		self.refreshTimeline();
		if (!value) {
			window.actorManager.allTurnNumbersOff();
		}
	});

	fightManager.on('HideSummonedFighters', function () {
	});

	gui.on('spellSlotSelected', function (spellId) {
		self.selectedSpell = spellId;
	});

	gui.on('spellSlotDeselected', function () {
		self.selectedSpell = null;
	});

	gui.on('resize', function (dimensions) {
		maxWidth = Math.floor(dimensions.mapWidth * 0.7);
	});

	this.on('collapse', function (isCollapsed) {
		this.isCollapsed = isCollapsed;
		this._refreshAfterResize();
	});

	this.on('dragEnd', function () {
		this.fighterListScroller.refresh(); // iScroll is messing around if we are close to screen's border
	});
};

Timeline.prototype._createContent = function () {
	gripBehavior(this, { isCollapsable: true });

	var infoAndFighters = this.infoAndFighters = this.createChild('div', { className: 'infoAndFighters' });

	this.fighterListContainer = infoAndFighters.createChild('div', {
		name: 'fighterListContainer',
		className: 'fighterListContainer'
	});
	this.fighterListScroller = this.fighterListContainer.appendChild(new Scroller({
		name: 'fighterListScroller',
		className: 'fighterList'
	}, {
		isHorizontal: true
	}));
	this.fighterList = this.fighterListScroller.content;

	this.infoContainer = infoAndFighters.createChild('div', { className: 'infoContainer' });
	this.turnCountLabel = this.infoContainer.createChild('div', { className: 'turnCountLabel' });
	this.fightControlButtons = this.infoContainer.appendChild(new FightControlButtons());

	this.buffList = this.appendChild(new FightBuffs());
};

Timeline.prototype.close = function () {
	if (this.currentFighter) {
		this.unsetTurnOf(this.currentFighter);
	}
	this.selectedFighter = null;
	this.buffList.close();

	this.hide();

	this.fighterList.clearContent();
	this.turnCountLabel.clearContent();
};

Timeline.prototype.restoreFighterList = function () {
	this.infoAndFighters.insertAsFirstChild(this.fighterListContainer);
	this.restartTimerAnimation();
	this.refreshTimeline();
};

Timeline.prototype.appendFighterListTo = function (wuiDomElement) {
	wuiDomElement.appendChild(this.fighterListContainer);
	this.restartTimerAnimation();
	this.refreshTimeline();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * Update the turn list content.
 */
Timeline.prototype.refreshTimeline = function () {
	// TODO: Temporary way to check if we are in preparation or in battle
	var preparation = window.foreground.tapOptions.mode === 'fightPlacement';
	var fightManager = window.gui.fightManager;
	var ids = fightManager.getFighters();
	var deadsIds = fightManager.getDeadFighters();
	var fighters = fightManager.getAvailableFighters();
	var idsMap = {};
	var id;
	var fighter;
	var fighterNumber = 1;
	var i;

	// If in preparation we clean up the fighter list because fighters' order might be rearranged
	if (preparation) {
		var fighterListChildren = this.fighterList.getChildren();
		for (i = 0; i < fighterListChildren.length; i++) {
			this.fighterList.removeChild(fighterListChildren[i]);
		}
	}

	// add new fighters, and construct new fighter ids map.
	var nextFighter;
	var len = ids.length;
	var totalWidth = 0;
	for (i = 0; i < len; i++) {
		id = ids[i];
		idsMap[id] = true;
		fighter = fighters[id] || fightManager.addFighter(id);

		// Update fighter status
		var alive = deadsIds.indexOf(id) < 0;
		fighter.setAlive(alive, /*isRefresh=*/true);
		if (!alive && gameOptions.hideDeadFighters) { continue; }

		fighter.updateNumber(alive && fighterNumber++);

		totalWidth += fighter.isSummon() ? FIGHTER_WIDTH_SUMMON : FIGHTER_WIDTH;

		if (!this.fighterList.getChild(id)) {
			nextFighter = null;
			for (var j = i + 1; j < len; j++) {
				nextFighter = this.fighterList.getChild(ids[j]);
				if (nextFighter) {
					break;
				}
			}
			this.fighterList.insertChildBefore(fighter.picto, nextFighter);
			// Fighter illustration has to be resized the first time it's attached to the DOM
			fighter.resizeFighterIllustration();
		}
	}

	// remove fighters not in the list
	if (!preparation) {
		for (id in fighters) {
			if (!idsMap[id]) {
				var picto = this.fighterList.getChild(id);
				if (picto) {
					this.fighterList.removeChild(picto);
				}
			}
		}
	}

	totalWidth = Math.min(totalWidth, maxWidth);
	this.fighterListContainer.setStyle('width', totalWidth + 'px');
	this._refreshAfterResize();
};

Timeline.prototype._refreshAfterResize = function () {
	this.emit('resized'); // NB: must be done before refreshing scroller since timeline might move
	this.fighterListScroller.refresh();
	if (this.isCollapsed && this.currentFighter) {
		this.fighterListScroller.showElement(this.currentFighter.picto);
	}
};

Timeline.prototype.onOrderFightersSwitched = function () {
	var fightersPicto = this.fighterList.getChildren();
	var fightManager = window.gui.fightManager;
	var fighterNumber = 1;
	for (var i = 0, len = fightersPicto.length; i < len; i++) {
		var fighterId = fightersPicto[i].getWuiName();
		var fighter = fightManager.getFighter(fighterId);
		if (!fighter) {
			return console.error('Fighters\' order switch failed, fighter does not exist.');
		}

		if (fighter.data.alive) {
			fighter.updateNumber(fighterNumber);
			fighterNumber++;
		} else {
			fighter.updateNumber();
		}
	}
};

Timeline.prototype.linkToTimeline = function (fighter) {
	var self = this;

	addTooltip(fighter.picto, function () {
		if (self.statsDetails) {
			fighter.refreshStatsTooltipContent(self.statsDetails);
		} else {
			self.statsDetails = fighter.createStatsTooltipContent();
		}
		return self.statsDetails;
	});

	fighter.picto.on('tap', function () {
		self.onFighterSelected(fighter);
	});
	fighter.picto.on('tooltipOn', function () {
		self.onPressEntity(fighter, false);
		window.isoEngine.displayEnemyMovementZone(fighter);
	});
	fighter.picto.on('tooltipOut', function () {
		self.onReleaseEntity();
		window.isoEngine.removeEnemyMovementZone();
	});

	dragManager.setDroppable(fighter.picto, ['shortcutBar']);
	fighter.picto.on('beforeDragEnd', function () {
		self.onFighterSelected(fighter);
	});
};

Timeline.prototype.onFighterSelected = function (fighter) {
	if (this.selectedSpell || this.selectedSpell === 0) {
		var gui = window.gui;
		var controlledCharacterId = gui.playerData.characters.controlledCharacterId;
		if (fighter.data.alive &&
			gui.fightManager.currentFighterId === controlledCharacterId) {
			window.dofus.sendMessage('GameActionFightCastOnTargetRequestMessage', {
				spellId: this.selectedSpell,
				targetId: fighter.id
			});
			gui.fightManager.spellCastSucceeded(this.selectedSpell, controlledCharacterId);
			window.isoEngine.clearSpellDisplay();
			gui.shortcutBar.deselectIcon();
		}
		return;
	}

	if (this.selectedFighter) {
		window.actorManager.selectionIndicatorOff(this.selectedFighter);
		this.selectedFighter.picto.delClassNames('selected');
	}

	// Tap on already selected fighter?
	if (this.selectedFighter === fighter) {
		// Deselect the fighter and hide buffs
		this.selectedFighter = null;
		this.buffList.hide();
	} else {
		// Select fight and show/update buffs
		window.actorManager.selectionIndicatorOn(fighter);
		fighter.picto.addClassNames('selected');
		this.selectedFighter = fighter;
		this.buffList.open(fighter);
	}
	this._refreshAfterResize();
};

// TODO: Specific behaviour for summoned creatures: highlight summoner ?
// TODO: Handle show if in range of selected spell and other special cases.
// See FightContextFrame.a, function overEntity(...)
Timeline.prototype.onPressEntity = function (fighter /*, showRange */) {
	if (!fighter || fighter.data.stats.invisibilityState === GameActionFightInvisibilityStateEnum.INVISIBLE) {
		return;
	}
	window.isoEngine.highlightActorOnAction(fighter.id, 1000);
};

Timeline.prototype.onReleaseEntity = function () {
	// TODO: See FightContextFrame.as, function outEntity

	window.isoEngine.clearHighlights();
};

Timeline.prototype.restartTimerAnimation = function () {
	if (!this.currentFighter || !this.timerTween) {
		return;
	}
	this.timerTween.cancel();

	var timerCount = Date.now() - this.timerTimestamp;
	if (timerCount < 0 || timerCount >= this.timerDuration) {
		return;
	}
	var waitTime = this.timerDuration - timerCount;
	var completionRate = Math.ceil(100 * timerCount / this.timerDuration);
	this.playTimerAnimation(waitTime, completionRate);
};

Timeline.prototype.startTimerAnimation = function (waitTime) {
	this.timerTimestamp = Date.now();
	this.timerDuration = waitTime;
	this.playTimerAnimation(waitTime, 0);
};

Timeline.prototype.stopTimerAnimation = function () {
	this.timerTimestamp = null;
	this.timerDuration = null;
	this.timerTween.cancel();
	this.timerTween = null;

	var picto = this.currentFighter.picto;
	picto.delClassNames('current');
	picto.fighterTimeValue.setStyles({
		webkitTransition: '',
		webkitTransform: 'translate3d(0,100%,0)'
	});
};

Timeline.prototype.playTimerAnimation = function (waitTime, completionRate) {
	var picto = this.currentFighter.picto;
	picto.fighterTimeValue.setStyle('webkitTransform', 'translate3d(0, ' + (100 - completionRate) + '%, 0)');
	this.timerTween = tweener.tween(picto.fighterTimeValue,
		{ webkitTransform: 'translate3d(0, 0, 0)' },
		{ time: waitTime, easing: 'linear' }
	);
	picto.addClassNames('current');
	if (this.isCollapsed) { this.fighterListScroller.showElement(picto); }
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** End turn of current fighter playing (if any)
 * @param {Number} fighter - fighter
 */
Timeline.prototype.unsetTurnOf = function (fighter) {
	if (!this.currentFighter || this.currentFighter !== fighter) {
		return;
	}
	window.actorManager.turnIndicatorOff(fighter);
	this.stopTimerAnimation();
	this.currentFighter = null;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Start turn for a fighter
 * @param {Number} fighter - fighter
 */
Timeline.prototype.setTurnOf = function (fighter, waitTime) {
	if (this.currentFighter) {
		this.unsetTurnOf(this.currentFighter);
	}
	this.currentFighter = fighter;
	this.startTimerAnimation(waitTime);

	this.emit('setTurnOf', fighter, waitTime);

	if (this._previousFighter) {
		window.actorManager.turnIndicatorOff(this._previousFighter);
	}
	window.actorManager.turnIndicatorOn(fighter);
	this._previousFighter = fighter;
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Timeline/index.js
 ** module id = 578
 ** module chunks = 0
 **/