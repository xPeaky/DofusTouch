var FIGHT_STATES                    = require('fightManager').FIGHT_STATES;
var Foreground                      = require('./main.js');
var dimensions                      = require('dimensionsHelper').dimensions;
var positionHelper                  = require('positionHelper');
var getElementPositionAt            = positionHelper.getElementPositionAt;
var getElementPositionCenteredAt    = positionHelper.getElementPositionCenteredAt;
var tapHelper                       = require('tapHelper');
var tapPosition                     = tapHelper.position;
var getTouch                        = tapHelper.getPosition;
var requestInteractionHandle        = require('interactionHandler').requestInteractionHandle;
var StarCounter                     = require('StarCounter');
var transformBehavior               = require('transformBehavior');
var TooltipBox                      = require('TooltipBox');
var tweener                         = require('tweener');
var Tween                           = require('TINAlight').Tween;
var addTooltip                      = TooltipBox.addTooltip;
var Ornament                        = require('Ornament');
var WuiDom                          = require('wuidom');


Foreground.prototype._setupTouchInteraction = function () {
	var self = this;
	var infoBox = this.infoBox;
	var isoEngine = window.isoEngine;
	var fightManager = window.gui.fightManager;
	var touchStarted, isCancelled, lastX, lastY;

	function positionInfoBox(touch) {
		if (!infoBox.isVisible()) { return; }

		var pos = getElementPositionAt(infoBox, touch.x, touch.y);
		infoBox.setStyle('webkitTransform', 'translate3d(' + pos.x + 'px, ' + pos.y + 'px, 0)');
	}

	var cancelTap;
	var touchHandle = {};

	function touchMove(e) {
		var touch = getTouch(e);

		positionInfoBox(touch);

		if (Math.abs(lastX - touch.x) > 10 || Math.abs(lastY - touch.y) > 10) {
			if (!requestInteractionHandle(touchHandle)) { return cancelTap(); }

			lastX = touch.x;
			lastY = touch.y;
			var canvasCoordinate = self.convertScreenToCanvasCoordinate(lastX, lastY);
			isoEngine.touchMove(canvasCoordinate.x, canvasCoordinate.y, this.tapOptions);
		}
	}

	cancelTap = function () {
		isCancelled = true;
		isoEngine.touchCancel();
		self.removeListener('dom.touchmove', touchMove);
	};

	// src/views/ui/mainUi/Compass/index.js is also emitting this event from here
	this.on('dom.touchstart', function (e) {
		if (touchStarted) { return cancelTap(); }
		var touch = getTouch(e);
		if (this.locked || touch.touchCount > 1) { return; }

		lastX = touch.x;
		lastY = touch.y;
		touchStarted = true;
		isCancelled = false;

		if (fightManager.fightState === FIGHT_STATES.BATTLE) {
			this.on('dom.touchmove', touchMove);
		}
	});

	// src/views/ui/mainUi/Compass/index.js is also emitting this event from here
	this.on('dom.touchend', function (e) {
		this.removeListener('dom.touchmove', touchMove);
		if (this.locked || isCancelled || !touchStarted || !requestInteractionHandle(touchHandle)) {
			touchStarted = false;
			return;
		}

		touchStarted = false;
		var touch = getTouch(e);
		var canvasCoordinate = self.convertScreenToCanvasCoordinate(touch.x, touch.y);
		isoEngine.touchEnd(canvasCoordinate.x, canvasCoordinate.y, this.tapOptions);
	});

	// order is important. that's why this method is called here.
	this._setupHighlightInteraction();
	this._setupCameraInteraction();
};

Foreground.prototype._setupHighlightInteraction = function () {
	var self = this;
	var ornament = new Ornament({ name: 'ornamentTooltip' }, { scaleFactor: 0.8 });
	var sceneTooltip = new WuiDom('div', { className: 'sceneTooltip' });

	addTooltip(this, new WuiDom('div'), { position: tapPosition });

	var isoEngine = window.isoEngine;
	var gui = window.gui;
	var fightManager = gui.fightManager;
	var tooltip = this.appendChild(new TooltipBox({
		content: sceneTooltip
	}));
	var lastElement, lastOrnamentElement;
	var scene = isoEngine.mapScene;
	var mapRenderer = isoEngine.mapRenderer;

	var tooltipTimeoutId;

	function closeTooltipWithDelay() {
		window.clearTimeout(tooltipTimeoutId);
		tooltipTimeoutId = window.setTimeout(function () {
			tooltip.close();
		}, 500);
	}

	function setOrnament(elementData) {
		var options = elementData.humanoidInfo.options || [];

		var titleId, ornamentId, guild, alliance;

		for (var i = 0; i < options.length; i += 1) {
			var option = options[i];

			if (option._type === 'HumanOptionGuild') {
				guild = option.guildInformations;
			} else if (option._type === 'HumanOptionAlliance') {
				alliance = option.allianceInformations;
			} else if (option._type === 'HumanOptionOrnament') {
				ornamentId = option.ornamentId;
			} else if (option._type === 'HumanOptionTitle') {
				titleId = option.titleId;
			}
		}

		ornament.setAttributes({
			charName: elementData.name,
			titleId: titleId,
			ornamentId: ornamentId,
			guild: guild,
			alliance: alliance,
			gender: elementData.humanoidInfo.sex,
			alignmentInfos: elementData.alignmentInfos
		});
		ornament.display();
	}

	function clearSceneTooltip() {
		if (sceneTooltip.getChild('ornamentTooltip')) {
			sceneTooltip.removeChild('ornamentTooltip');
		}
		sceneTooltip.clearContent();
	}

	function openTooltip(element) {
		window.clearTimeout(tooltipTimeoutId);
		tooltip.open(null, tapPosition);
		var box = element.bbox;
		var posTopLeft = scene.convertSceneToCanvasCoordinate(box[0], box[2]);
		var posBottomRight = scene.convertSceneToCanvasCoordinate(box[1], box[3]);
		var centerX = (posTopLeft.x + posBottomRight.x) / 2;
		var centerY = (posTopLeft.y + posBottomRight.y) / 2;
		var height = posBottomRight.y - posTopLeft.y;
		var verticalMargin = height / 2 + 15; // top or bottom of the bounding box +/- the number of pixels given here

		var pos = getElementPositionCenteredAt(tooltip, centerX, centerY, { verticalMargin: verticalMargin });
		tooltip.setStyle('webkitTransform', 'translate3d(' + pos.x + 'px,' + pos.y + 'px,0)');
	}

	function moveOverActorInFight(elementData) {
		var fighter = fightManager.getFighter(elementData.actorId);
		if (!fighter) {
			if (tooltip.openState) {
				closeTooltipWithDelay();
				window.isoEngine.removeEnemyMovementZone();
			}
			return false;
		}
		sceneTooltip.appendChild(fighter.createStatsTooltipContent());
		window.isoEngine.displayEnemyMovementZone(fighter);
		return true;
	}

	function moveOverActorInRoleplay(element, elementData) {
		if (elementData.name && elementData.humanoidInfo) {
			lastOrnamentElement = element;
			setOrnament(elementData);
			tooltip.addClassNames('noBackground');
			return false;
		} else if (elementData.npcData && elementData.npcData.nameId) {
			sceneTooltip.setText(elementData.npcData.nameId);
		} else if (elementData.type === 'GameRolePlayGroupMonsterInformations') {
			sceneTooltip.appendChild(new StarCounter(elementData.ageBonus));
			var monsters = [elementData.staticInfos.mainCreatureLightInfos].concat(elementData.staticInfos.underlings);
			for (var i = 0, len = monsters.length; i < len; i += 1) {
				var monster = monsters[i].staticInfos;
				if (!monster) { continue; }
				sceneTooltip.createChild('div', { text: monster.nameId + ' (' + monster.level + ')' });
			}
		} else if (elementData.type === 'PaddockObject') {
			var durability = elementData.durability.durability + '/' + elementData.durability.durabilityMax;
			sceneTooltip.setText(elementData.name + ' (' + durability + ')');
		} else {
			if (tooltip.openState) { closeTooltipWithDelay(); }
			return false;
		}
		return true;
	}

	function holdAndMove() {
		var canvasCoordinate = self.convertScreenToCanvasCoordinate(tapPosition.x, tapPosition.y);
		var element = isoEngine.holdAndMove(canvasCoordinate.x, canvasCoordinate.y);
		if (!element) {
			lastElement = null;
			if (tooltip.openState) { closeTooltipWithDelay(); }
			return;
		}

		if (lastElement === element) { return; }
		lastElement = element;

		var elementData = element.data;
		var interactive, skill, i, len;
		var isInFight = gui.playerData.isFighting;
		if (!elementData) { // graphics element: doors, stairs...
			interactive = mapRenderer.interactiveElements[element.id];
			if (!interactive || isInFight) {
				if (tooltip.openState) { closeTooltipWithDelay(); }
				return;
			}

			clearSceneTooltip();

			if (interactive.ageBonus) {
				var ageBonus = interactive.ageBonus;
				sceneTooltip.appendChild(new StarCounter(ageBonus));
			}

			if (interactive._name) {
				sceneTooltip.createChild('div', { className: 'name', text: interactive._name });
			}

			var skillBox;
			for (i = 0, len = interactive.enabledSkills.length; i < len; i += 1) {
				skill = interactive.enabledSkills[i];
				skillBox = sceneTooltip.createChild('div');
				skillBox.createChild('div', { className: ['interaction', 'cursor', 'id' + skill._cursor] });
				skillBox.createChild('div', { className: 'interaction', text: skill._name });
			}

			for (i = 0, len = interactive.disabledSkills.length; i < len; i += 1) {
				skill = interactive.disabledSkills[i];
				skillBox = sceneTooltip.createChild('div');
				skillBox.createChild('div', { className: ['interaction', 'cursor', 'id' + skill._cursor, 'disable'] });
				skillBox.createChild('div', { className: 'interaction', text: skill._name });
			}
		} else { // interactives: NPC, monsters, players...
			clearSceneTooltip();

			if (isInFight) {
				if (!moveOverActorInFight(elementData)) { return; }
			} else {
				if (!moveOverActorInRoleplay(element, elementData)) { return; }
			}
		}
		tooltip.delClassNames('noBackground');
		openTooltip(element);
	}

	this.on('tooltipOn', function () {
		window.gui.tooltipBox.close(true);
		lastElement = null;
		isoEngine.holdStart();
		gui.wBody.on('dom.touchmove', holdAndMove);
		holdAndMove();
	});

	this.on('tooltipOut', function () {
		tooltip.close();
		gui.wBody.removeListener('dom.touchmove', holdAndMove);
		isoEngine.holdEnd();
	});

	ornament.on('rendered', function () {
		if (lastOrnamentElement !== lastElement) { return; }
		sceneTooltip.appendChild(ornament);
		openTooltip(lastOrnamentElement);
	});
};

Foreground.prototype._setupCameraInteraction = function () {
	transformBehavior(this);

	var curTimeT;
	var self = this;
	var gui = window.gui;
	var isoEngine = window.isoEngine;
	var mapScene = isoEngine.mapScene;
	var camera = mapScene.camera;
	var fightManager = gui.fightManager;
	var averageDx = 0,
		averageDy = 0;

	var leftSlider = this.createChild('div', { className: ['slide', 'left'] });
	leftSlider.arrow = leftSlider.createChild('div', { className: 'arrow' });
	var rightSlider = this.createChild('div', { className: ['slide', 'right'] });
	rightSlider.arrow = rightSlider.createChild('div', { className: 'arrow' });
	var topSlider = this.createChild('div', { className: ['slide', 'top'] });
	topSlider.arrow = topSlider.createChild('div', { className: 'arrow' });
	var bottomSlider = this.createChild('div', { className: ['slide', 'bottom'] });
	bottomSlider.arrow = bottomSlider.createChild('div', { className: 'arrow' });

	var slider, direction, boundStepMin, boundStepMax;
	var start = { x: 0, y: 0 };
	var limit = { x: 80, y: 60 }; // how much the slider comes out
	var slideLimit = { max: 0, min: 0 };
	var changeMapPos = {};
	var changeMapCellId;
	var slideThreshold = 5;
	var sliderPos = { x: 0, y: 0 };
	var gap, slideAxis, cameraScrollAxis;

	var sceneCoordinate = {};
	var bound = { x: 0, y: 0 };
	var scrollTweens = {
		x: new Tween(sceneCoordinate, ['x']),
		y: new Tween(sceneCoordinate, ['y'])
	};

	this.on('transformStart', function (touch, initTouch) {
		if (this.locked) { return this.cancelTransform(); }

		slider = null;

		if (fightManager.fightState === FIGHT_STATES.UNDEFINED && touch.touchCount === 1) {
			var deltaX = touch.x - initTouch[0].x;
			var deltaY = touch.y - initTouch[0].y;
			start = touch;
			var isMaxZoom = camera.zoom === camera.minZoom || camera.zoom === camera.maxZoom;
			var thresholdValid;
			if (Math.abs(deltaX) > Math.abs(deltaY)) {
				thresholdValid = isMaxZoom || Math.abs(deltaY) < slideThreshold;
				if (Math.abs(camera.x - camera.min.x) < 1 && deltaX > 0 && thresholdValid) {
					slider = leftSlider;
					direction = 'left';
					changeMapPos.x = 0;
					slideLimit.min = 0;
					slideLimit.max = limit.x;
					boundStepMin = dimensions.mapHeight / 3;
					boundStepMax = 2 * boundStepMin;
					slideAxis = 'x';
					cameraScrollAxis = 'y';
					return;
				} else if (Math.abs(camera.x - camera.max.x) < 1 && deltaX < 0 && thresholdValid) {
					slider = rightSlider;
					direction = 'right';
					changeMapPos.x = dimensions.mapWidth;
					slideLimit.min = -limit.x;
					slideLimit.max = 0;
					boundStepMin = dimensions.mapHeight / 3;
					boundStepMax = 2 * boundStepMin;
					slideAxis = 'x';
					cameraScrollAxis = 'y';
					return;
				}
			} else {
				thresholdValid = isMaxZoom || Math.abs(deltaX) < slideThreshold;
				if (Math.abs(camera.y - camera.min.y) < 1 && deltaY > 0 && thresholdValid) {
					slider = topSlider;
					direction = 'top';
					changeMapPos.y = 0;
					slideLimit.min = 0;
					slideLimit.max = limit.y;
					boundStepMin = dimensions.mapWidth / 3;
					boundStepMax = 2 * boundStepMin;
					slideAxis = 'y';
					cameraScrollAxis = 'x';
					return;
				} else if (Math.abs(camera.y - camera.max.y) < 1 && deltaY < 0 && thresholdValid) {
					slider = bottomSlider;
					direction = 'bottom';
					changeMapPos.y = dimensions.mapHeight;
					slideLimit.min = -limit.y;
					slideLimit.max = 0;
					boundStepMin = dimensions.mapWidth / 3;
					boundStepMax = 2 * boundStepMin;
					slideAxis = 'y';
					cameraScrollAxis = 'x';
					return;
				}
			}
		}

		averageDx = averageDy = 0;
		this.setTranslationEnable(true);
		curTimeT = Date.now();
	});

	function updateSliderPos(touch) {
		sliderPos[slideAxis] = touch[slideAxis] - start[slideAxis];
		sliderPos[cameraScrollAxis] = touch[cameraScrollAxis];
		if (sliderPos[slideAxis] < slideLimit.min) {
			sliderPos[slideAxis] = slideLimit.min;
			start[slideAxis] = touch[slideAxis] - slideLimit.min;
		} else if (sliderPos[slideAxis] > slideLimit.max) {
			sliderPos[slideAxis] = slideLimit.max;
			start[slideAxis] = touch[slideAxis] - slideLimit.max;
		}

		slider.setStyle('webkitTransform', 'translate3d(' + sliderPos.x + 'px,' + sliderPos.y + 'px,0)');
	}

	function checkForAutoScroll(touch) {
		changeMapPos[cameraScrollAxis] = sliderPos[cameraScrollAxis];
		var canvasCoordinate = self.convertScreenToCanvasCoordinate(changeMapPos.x, changeMapPos.y);
		changeMapCellId = isoEngine.getChangeMapCellAt(canvasCoordinate.x, canvasCoordinate.y, direction);
		slider.arrow.setStyle('opacity', changeMapCellId !== -1 ? 1 : 0);

		if (touch[cameraScrollAxis] < boundStepMin) {
			gap = Math.abs(boundStepMin - touch[cameraScrollAxis]);
			bound[cameraScrollAxis] = camera.min[cameraScrollAxis];
		} else if (touch[cameraScrollAxis] > boundStepMax) {
			gap = Math.abs(boundStepMax - touch[cameraScrollAxis]);
			bound[cameraScrollAxis] = camera.max[cameraScrollAxis];
		} else {
			return;
		}

		if (bound[cameraScrollAxis] === camera[cameraScrollAxis]) { return; }

		sceneCoordinate.x = camera.x;
		sceneCoordinate.y = camera.y;
		camera.follow(sceneCoordinate);

		var longestDistance = 0;
		var speed = autoSpeed;

		var from = sceneCoordinate[cameraScrollAxis];
		var to = bound[cameraScrollAxis];

		if (Math.abs(bound[cameraScrollAxis] - sceneCoordinate[cameraScrollAxis]) > longestDistance) {
			longestDistance = Math.abs(bound[cameraScrollAxis] - sceneCoordinate[cameraScrollAxis]);
			speed = autoSpeed * gap;
		}

		var scrollTween = scrollTweens[cameraScrollAxis];
		if (!scrollTween.playing) {
			scrollTween.start(false);
		}

		if (cameraScrollAxis === 'x') {
			scrollTween.reset().from({ x: from }).to({ x: to }, longestDistance / speed);
		} else {
			scrollTween.reset().from({ y: from }).to({ y: to }, longestDistance / speed);
		}
	}

	var autoSpeed = 0.5;
	this.on('transform', function (centerX, centerY, deltaX, deltaY, scale, touch) {
		if (slider) {
			updateSliderPos(touch);
			checkForAutoScroll(touch);
			return;
		}

		isoEngine.cancelCameraMovement();
		curTimeT = Date.now();

		if (camera.zoom === camera.minZoom) { // freeze the translation when we are zoomed out
			deltaX = deltaY = 0;
		}

		// Weighted average of delta (x,y)
		averageDx = 0.5 * averageDx + 0.5 * -deltaX;
		averageDy = 0.5 * averageDy + 0.5 * -deltaY;

		mapScene.move(centerX, centerY, -deltaX, -deltaY, scale);
	});

	this.on('transformEnd', function () {
		if (scrollTweens.x.playing) {
			scrollTweens.x.stop();
		}

		if (scrollTweens.y.playing) {
			scrollTweens.y.stop();
		}

		if (slider) {
			var sliderTranslation;
			if (slideAxis === 'x') {
				sliderTranslation = 'translate3d(' + 0 + ',' + sliderPos.y + 'px,0)';
			} else {
				sliderTranslation = 'translate3d(' + sliderPos.x + 'px,' + 0 + ',0)';
			}
			tweener.tween(
				slider,
				{ webkitTransform: sliderTranslation },
				{ time: 200, easing: 'ease-out' }
			);
			slider.arrow.setStyle('opacity', 0);
			slider = null;

			// Foreground can be locked if you started sliding before a map transition
			if (this.locked) { return; }

			// release the finger at the limit, we validate the map change
			if (Math.abs(sliderPos[slideAxis]) === limit[slideAxis] && changeMapCellId !== -1) {
				var canvasCoordinate = self.convertScreenToCanvasCoordinate(changeMapPos.x, changeMapPos.y);

				// simulate a tap at the border of the screen to go through the same logic, no matter the way the user
				// gave the order: with a tap or a slide
				var sceneCoordinate = mapScene.convertCanvasToSceneCoordinate(changeMapPos.x, changeMapPos.y);
				isoEngine._tapRoleplay(
					sceneCoordinate.x,
					sceneCoordinate.y,
					isoEngine.mapRenderer.getCellId(sceneCoordinate.x, sceneCoordinate.y),
					{
						canvasX: canvasCoordinate.x,
						canvasY: canvasCoordinate.y,
						changeMapRequest: direction,
						mode: 'roleplay'
					}
				);
			}
			return;
		}

		this.setTranslationEnable(fightManager.fightState !== FIGHT_STATES.BATTLE);
		if (Date.now() - curTimeT > 100) {
			// Inertia not added if no slide happened for more than 100ms
			return;
		}

		camera.addInertia(averageDx, averageDy, 0.8);
	});

	fightManager.on('fightEnterBattle', function () {
		self.setTranslationEnable(false);
	});

	fightManager.on('fightEnd', function () {
		self.setTranslationEnable(true);
	});

	gui.playerData.position.on('mapUpdate', function () {
		camera.follow(window.isoEngine.actorManager.userActor);
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Converts a screen coordinate to a foreground/canvas/map coordinate
 *
 * @param  {number} x - x coordinate of point
 * @param  {number} y - y coordinate of point
 *
 * @return {Object} canvasCoordinate object
 */

Foreground.prototype.convertScreenToCanvasCoordinate = function (x, y) {
	return {
		x: x - dimensions.mapLeft,
		y: y - dimensions.mapTop
	};
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Converts a foreground/canvas/map coordinate to screen coordinate
 *
 * @param  {number} x - x coordinate of point
 * @param  {number} y - y coordinate of point
 *
 * @return {Object} screenCoordinate object
 */

Foreground.prototype.convertCanvasToScreenCoordinate = function (x, y) {
	return {
		x: x + dimensions.mapLeft,
		y: y + dimensions.mapTop
	};
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Converts a screen coordinate to a scene coordinate
 *
 * @param  {number} x - x coordinate of point
 * @param  {number} y - y coordinate of point
 *
 * @return {Object} sceneCoordinate object
 */

Foreground.prototype.convertScreenToSceneCoordinate = function (x, y) {
	x -= dimensions.mapLeft; // screen to canvas
	y -= dimensions.mapTop; // screen to canvas
	return window.isoEngine.mapScene.convertCanvasToSceneCoordinate(x, y);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Converts a scene coordinate to screen coordinate
 *
 * @param  {number} x - x coordinate of point
 * @param  {number} y - y coordinate of point
 *
 * @return {Object} screenCoordinate object
 */

Foreground.prototype.convertSceneToScreenCoordinate = function (x, y) {
	var canvasCoord = window.isoEngine.mapScene.convertSceneToCanvasCoordinate(x, y);
	return {
		x: canvasCoord.x + dimensions.mapLeft,
		y: canvasCoord.y + dimensions.mapTop
	};
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Foreground/touchInteraction.js
 ** module id = 215
 ** module chunks = 0
 **/