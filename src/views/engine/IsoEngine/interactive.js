var constants       = require('constants');
var IsoEngine       = require('./main.js');
var mapPoint        = require('mapPoint');
var getText         = require('getText').getText;
var getTextFailover = require('getText').getTextFailover;
var TextSprite      = require('TextSprite');
var Grid9Graphic    = require('Grid9Graphic');
var Actor           = require('Actor');
var pointVariation  = require('pointVariation');
var FIGHT_STATES    = require('fightManager').FIGHT_STATES;
var trueName        = require('rumplestiltskin').trueName;

var TINA   = require('TINAlight');
var Delay  = TINA.Delay;
var Tween  = TINA.Tween;
var easing = TINA.easing;

var HIGHLIGHT = { red: 1.7, green: 1.7, blue: 1.7, alpha: 1 };
var INSTANT_HIGHLIGHT_DURATION = 10; // in tups

var HIGHLIGHT_TYPE = {
	DEFAULT: 1,
	QUEUE: 2
};

var DEFAULT_INTERACTIVE_ACTION = [
	{
		elementTypeId: 16, // Zaap
		skillId: 114 // Use
	},
	{
		elementTypeId: -1, // unknown (like most building doors, chests)
		skillId: 84 // Enter
	},
	{
		elementTypeId: -1, // unknown (like most building doors, chests)
		skillId: 104 // Open
	},
	{
		elementTypeId: 120, // Paddock
		skillId: 175 // Access
	}
];

// The duration (ms) we are waiting for the server response after sending him an interactiveUseRequest.
// In this context "waiting" means that the following player orders are queued instead of behing executed immediatly.
var WAITING_FOR_INTERACTIVE_USE_ANSWER_DELAY = 3000;
// List of timeout ids
var interactiveUseWaitingForServer = {};
// Used to store user loop animations timeout method (if server does not send an InteractiveUseEnded message)
var userAnimLoopTimeout = null;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Check if pixel of coordinate (x, y) of an element is opaque or not
 *
 * @private
 *
 * @param {Object} element - element to check
 * @param {number} x       - tap x coordinate
 * @param {number} y       - tap y coordinate
 *
 * @return {boolean} true if pixel at coordinate (x, y) of element is opaque
 *
 */
var WIDTH  = 4;
var HEIGHT = 4;
var pixels = new Uint8Array(WIDTH * HEIGHT * 4);
var renderTarget = null;
IsoEngine.prototype._isElementClicked = function (element, x, y) {
	if (!element.isWithinBounds(x, y)) {
		// (x, y) is not within the bounds of the element
		// it is not clicked.
		return false;
	}

	// (x, y) is within the bounds of the elements
	// pixels are being tested.
	var w  = WIDTH;
	var h  = HEIGHT;

	x = x - w / 2;
	y = y - h / 2;

	var renderer = element.renderer;
	if (renderTarget === null) {
		// Creating a render target
		renderTarget = renderer.startTextureUsage(w, h, 1, 'clickedInteractive');
	}

	// Start texture rendering
	renderer.startTextureRendering(renderTarget, x, x + w, y, y + h, true);

	// Rendering element into the texture
	element.render();

	// Fetching pixels of rendered texture (on currently used frame buffer)
	var gl = renderer.gl;
	gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

	// Stop texture rendering
	renderer.stopTextureRendering();

	var nPixels  = pixels.length;
	var alphaSum = 0;
	for (var p = 3; p < nPixels; p += 4) {
		alphaSum += pixels[p];
	}

	// For debugging purpose:
	// var testCanvas  = document.createElement('canvas');
	// var testContext = testCanvas.getContext('2d');
	// testCanvas.width  = w;
	// testCanvas.height = h;
	// document.body.appendChild(testCanvas);
	// testCanvas.style.position = 'absolute';
	// testCanvas.style.left = 100 + 'px';
	// testCanvas.style.top  = 100 + 'px';
	// var testData  = testContext.getImageData(0, 0, w, h);
	// var testPixel = testData.data;
	// for (var p = 3; p < nPixels; p += 4) {
	// 	testPixel[p - 3] = pixels[p - 3];
	// 	testPixel[p - 2] = pixels[p - 2];
	// 	testPixel[p - 1] = pixels[p - 1];
	// 	testPixel[p - 0] = pixels[p - 0];
	// }
	// testContext.putImageData(testData, 0, 0);
	// testContext.fillRect(w / 2 - 5, h / 2 - 5, 10, 10);

	return alphaSum > 8;
};

function positionSort(a, b) { return b.position - a.position; }


IsoEngine.prototype._getAllInteractives = function () {
	var map          = this.mapRenderer;
	var elements     = map.identifiedElements;
	var interactives = map.interactiveElements;
	var actors       = this.actorManager.actors;

	// TODO: optimise click detection system by using the tree
	var allInteractives = []; // Including actors

	// Adding identified elements to list of interactives
	var interactiveIds = Object.keys(interactives);
	for (var i = 0; i < interactiveIds.length; i += 1) {
		var interactiveId = interactiveIds[i];
		var interactive = interactives[interactiveId];

		// don't consider interactive without any skills
		if (interactive.enabledSkills.length === 0 && interactive.disabledSkills.length === 0) { continue; }

		var element = elements[interactiveId];
		if (element) {
			allInteractives.push(element);
		}
	}

	// Adding actors to list of interactives
	var actorIds = Object.keys(actors);
	for (var a = 0; a < actorIds.length; a += 1) {
		allInteractives.push(actors[actorIds[a]]);
	}

	// Adding user actor
	allInteractives.push(this.actorManager.userActor);

	// Sorting with respect to positions
	allInteractives.sort(positionSort);

	return allInteractives;
};

/**
 * When we tap on an interactive which proposes a "go to" action, like "Go to Incarnam",
 * we don't want to do it without showing a context menu for confirmation
 * (because a mistap would be a big waste of time for the player).
 * @param {number} skillId
 * @return {boolean} true if given skillId is a "goto" action.
 */
function isGoToSkill(skillId) {
	switch (skillId) {
	case 183: // Incarnam
	case 200: // Temple
	case 212: // Sufokia
	case 213: // Amakna
		return true;
	default:
		return false;
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Check if user tapped an interactive element
 *
 * @private
 *
 * @param {number} x - tap x coordinate
 * @param {number} y - tap y coordinate
 *
 * @return {boolean} true if interactive element is tapped.
 *
 * TODO: interactive elements should be mixed with actors.
 */
IsoEngine.prototype._tapInteractive = function (x, y) {
	var interactives = this.mapRenderer.interactiveElements;
	var allInteractives = this._getAllInteractives();

	var tappedNpc = null, tappedObject = null, tappedActor = null;
	for (var i = 0; i < allInteractives.length; i++) {
		var element = allInteractives[i];
		if (!this._isElementClicked(element, x, y)) { continue; }
		if (element.actorId) {
			if (element.data && element.data.npcId) {
				if (!tappedNpc) { tappedNpc = element; }
			} else {
				if (!tappedActor) { tappedActor = element; }
			}
		} else {
			if (!tappedObject) { tappedObject = element; }
		}
	}
	// Keep one of the tapped "things", depending on priority order (note monsters are actors too)
	var tappedElement = tappedNpc || tappedObject || tappedActor;

	if (tappedElement === null) {
		this._lastTapId = null;
		return false;
	}

	var isSecondTap = false;

	// identify element with id and position
	var elementId = tappedElement.id || tappedElement.actorId; // actors don't have regular id
	var tapId = trueName([tappedElement._position, window.gui.playerData.position.mapId, elementId]);
	if (tapId === this._lastTapId) {
		isSecondTap = true;
		this._lastTapId = null;
	} else {
		this._lastTapId = tapId;
	}

	this.clearHighlights(null, HIGHLIGHT_TYPE.DEFAULT);

	var isQueued = this.actionQueue.isActive();

	// One element has been clicked
	// Element has a tap method
	if (tappedElement.tap) {
		// Elements with a tap method (e.g. actors) can not be queued
		if (!isQueued) {
			if (isSecondTap && tappedElement.actorId && tappedElement.data.type === 'GameRolePlayGroupMonsterInformations') {
				window.isoEngine.attackActor(tappedElement.actorId);
			} else {
				tappedElement.tap(x, y);
			}
		}
		return true;
	}

	// Element has no tap method
	var interactiveElement = interactives[tappedElement.id];
	if (!interactiveElement) {
		return true;
	}

	// If there is only one enabled skill available, use the interactive directly
	var enabledSkill = interactiveElement.enabledSkills[0];
	if (interactiveElement.enabledSkills.length === 1 && !isGoToSkill(enabledSkill.skillId)) {
		var self = this;
		var hasBeenQueued = this.actionQueue.enqueueInteractive(
			interactiveElement.elementId,
			interactiveElement.elementTypeId,
			function () {
				var enabledSkills = interactiveElement.enabledSkills;
				var singleEnabledSkill = enabledSkills.length === 1 && enabledSkills[0];
				// The interactive element might have been updated when this callback is called
				// Thus checking if the interactive still have only one enabled skill that can be queued
				if (!singleEnabledSkill) {
					self.actionQueue.clear();
					return self.clearHighlights(null, HIGHLIGHT_TYPE.QUEUE);
				}
				self.queueUseInteractive(interactiveElement.elementId, singleEnabledSkill.skillInstanceUid);
			}
		);
		if (hasBeenQueued) {
			this._addHighlight(tappedElement, HIGHLIGHT_TYPE.QUEUE);
			return true;
		}
		// If no actions are queued and this element could not be queued, use it directly
		if (!isQueued) {
			this.instantUseInteractive(interactiveElement.elementId, enabledSkill.skillInstanceUid);
			this._addHighlight(tappedElement);
		}
		return true;
	}

	// If actions are queued, elements with contextual menus will not be opened
	if (isQueued) {
		return true;
	}

	this._addHighlight(tappedElement);

	if (isSecondTap) {
		// check if interactive have default action
		for (var j = 0; j < DEFAULT_INTERACTIVE_ACTION.length; j++) {
			if (interactiveElement.elementTypeId !== DEFAULT_INTERACTIVE_ACTION[j].elementTypeId) {
				continue;
			}
			for (var k = 0; k < interactiveElement.enabledSkills.length; k++) {
				if (interactiveElement.enabledSkills[k].skillId !== DEFAULT_INTERACTIVE_ACTION[j].skillId) {
					continue;
				}
				// skill found in list: perform default action
				this.instantUseInteractive(interactiveElement.elementId, enabledSkill.skillInstanceUid);
				return true;
			}
		}
	}

	// Display a tooltip to let user choose the skill to use
	var localCoordinates = this.mapScene.convertSceneToCanvasCoordinate(x, y);
	window.gui.openContextualMenu('interactive', interactiveElement, { x: localCoordinates.x, y: localCoordinates.y });

	return true;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
IsoEngine.prototype._addHighlight = function (element, type) {
	type = type || HIGHLIGHT_TYPE.DEFAULT;
	element.highlight = HIGHLIGHT;
	if (!this.highlightedElements[type]) {
		this.highlightedElements[type] = [];
	}
	this.highlightedElements[type].push(element);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
IsoEngine.prototype._clearHighlightType = function (type) {
	var highlightedElements = this.highlightedElements[type];
	if (!highlightedElements) {
		return;
	}
	for (var i = 0; i < highlightedElements.length; i++) {
		highlightedElements[i].highlight = null;
	}
	this.highlightedElements[type] = [];
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
IsoEngine.prototype.clearHighlights = function (delay, type) {
	if (delay) {
		var self = this;
		var clearDelay = new Delay(delay, function () {
			self.clearHighlights(null, type);
		});
		return clearDelay.start();
	}
	if (type) {
		this._clearHighlightType(type);
	} else {
		for (var highlightType in this.highlightedElements) {
			this._clearHighlightType(highlightType);
		}
		this.highlightedElements = {};
	}
};

IsoEngine.prototype.queueUseInteractive = function (elemId, skillInstanceUid) {
	this.clearHighlights(null, HIGHLIGHT_TYPE.DEFAULT);
	this._useInteractive(elemId, skillInstanceUid);
};

IsoEngine.prototype.instantUseInteractive = function (elemId, skillInstanceUid) {
	this.clearHighlights(INSTANT_HIGHLIGHT_DURATION);
	this._useInteractive(elemId, skillInstanceUid);
};

IsoEngine.prototype.useInteractive = function (elemId, skillInstanceUid) {
	this.clearHighlights();
	this._useInteractive(elemId, skillInstanceUid);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** User request to use an interactive element
 *
 * @param {number} elemId
 * @param {number} skillInstanceUid
 */
IsoEngine.prototype._useInteractive = function (elemId, skillInstanceUid) {
	var self = this;
	var identifiedElement = this.mapRenderer.identifiedElements[elemId];
	var cellId = identifiedElement.position;
	var userActor = this.actorManager.userActor;

	// move next to interactive and request to use it
	// NB: we do not care about error nor target because some interactives can be activated from afar
	this._movePlayerOnMap(cellId, true, function (/*error, target*/) {
		var direction = mapPoint.getOrientation(userActor.cellId, cellId, false);
		// orient player to interactive
		userActor.setDisposition(null, direction);
		self._interactiveUseTrackServerAnswer(elemId, skillInstanceUid);
		// TODO: play interactive use animation.
		window.dofus.sendMessage('InteractiveUseRequestMessage', { elemId: elemId, skillInstanceUid: skillInstanceUid });
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** When server refuses the use of an interactive
 */
IsoEngine.prototype.onInteractiveUseErrorMessage = function (msg) {
	var elemId = msg.elemId;
	if (interactiveUseWaitingForServer[elemId] !== undefined) {
		window.clearTimeout(interactiveUseWaitingForServer[elemId]);
		delete interactiveUseWaitingForServer[elemId];
	}
	this.actionQueue.clear();
	var interactive = this.mapRenderer.identifiedElements[elemId];
	if (interactive) {
		interactive.highlight = null;
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Used to remember if we sent an "use interactive request" to the server recently and did not received an anwser yet
 *
 * @param {number} elemId
 */
IsoEngine.prototype._interactiveUseTrackServerAnswer = function (elemId) {
	var self = this;
	interactiveUseWaitingForServer[elemId] = window.setTimeout(function () {
		console.warn('Server has been too slow to answer to an interactiveUseRequest: we are not waiting for him');
		delete interactiveUseWaitingForServer[elemId];
		self.actionQueue.clear();
	}, WAITING_FOR_INTERACTIVE_USE_ANSWER_DELAY);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** To know if we are expecting the server to send to the client a "use interactive" message soon
 */
IsoEngine.prototype.isWaitingForInteractiveUseServerAnswer = function () {
	return (Object.keys(interactiveUseWaitingForServer).length > 0);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Server inform client that an actor start using an interactive.
 *
 * @param {Object} msg               - `InteractiveUsedMessage` sent by server
 * @param {number} msg.entityId      - id of actor using interactive
 * @param {number} msg.elemId        - interactive element id
 * @param {number} msg.skillId       - skill id used
 * @param {number} msg.duration      - use duration in 1/10 seconds (if 0, ack is not required)
 * @param {string} msg._useAnimation - (enriched) animation base name actor have to play.
 */
IsoEngine.prototype.interactiveUseStart = function (msg) {
	var self = this;

	var actor       = this.actorManager.getActor(msg.entityId);
	var interactive = this.mapRenderer.identifiedElements[msg.elemId];
	var isUserActor = (msg.entityId === window.gui.playerData.id);
	var loop        = (msg.duration !== 0);

	if (isUserActor) {
		// we are not waiting for this message anymore
		if (interactiveUseWaitingForServer[msg.elemId] !== undefined) {
			window.clearTimeout(interactiveUseWaitingForServer[msg.elemId]);
			delete interactiveUseWaitingForServer[msg.elemId];
		}

		// this may (should?) never happen
		if (userAnimLoopTimeout !== null) {
			console.error('interactiveUseStart: InteractiveUseStart received but was waiting an InteractiveUseEnded');
			this._userStopUsingInteractive();
		}
	}

	if (!actor) {
		if (isUserActor) {
			return console.error('interactiveUseStart: user actor is not ready');
		} else {
			return console.warn('interactiveUseStart: no actor with id ' + msg.entityId);
		}
	}

	if (!interactive) {
		return console[isUserActor ? 'error' : 'warn']('interactiveUseStart: no interactive with id ' + msg.elemId);
	}

	var animName = msg._useAnimation;
	if (!animName || animName === 'AnimStatique') {
		if (isUserActor) {
			self.actionQueue.dequeue(msg.elemId);
		}
		return;
	}

	interactive.highlight = null;

	// orient character toward interactive
	var orientation = mapPoint.getOrientation(actor.cellId, interactive.position, false);
	actor.setDisposition(null, orientation);

	// start animation
	actor.loadAndPlayAnimation({ base: animName }, loop);

	if (!loop) {
		if (isUserActor) {
			self.actionQueue.dequeue(msg.elemId);
		}
		return;
	}

	if (isUserActor) {
		// If character is the user we try to wait for InteractiveUseEnded message to stop the animation loop.
		// As a security in the case server is not answering, we are adding an arbitrary timeout of 2 times
		// the theorical duration.
		actor.isLocked = true;
		userAnimLoopTimeout = window.setTimeout(function () {
			self._userStopUsingInteractive(msg.elemId);
		}, msg.duration * 100 * /* timeout factor */ 2);
	} else {
		// If the character is not the user, we rely only on the animation duration.
		// (the server does not send an InteractiveUseEnded message for them)
		// See discussion in PR 3283 about known minor glitches that this timeout can cause
		window.setTimeout(function () {
			actor.staticAnim();
		}, msg.duration * 100);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Server inform client that user actor finished to use a skill on an interactive.
 *
 * @param {Object} msg               - `InteractiveUseEnded` sent by server
 * @param {number} msg.elemId        - interactive element id
 * @param {number} msg.skillId       - skill id used
 */
IsoEngine.prototype.interactiveUseEndedMessage = function (msg) {
	this._userStopUsingInteractive(msg.elemId);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Triggered when user actor finished to use a skill on an interactive (server info or timeout)
 *
 * @param {number} elemId - interactive element id
 */
IsoEngine.prototype._userStopUsingInteractive = function (elemId) {
	if (userAnimLoopTimeout !== null) {
		clearTimeout(userAnimLoopTimeout);
		userAnimLoopTimeout = null;
	}
	var actor = this.actorManager.userActor;
	actor.isLocked = false;
	actor.staticAnim();
	this.actionQueue.dequeue(elemId);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update interactive elements data
 *
 * @param {Object[]} list - list of modified interactives elements
 *        {number}   list[*].elementId      - interactive element id
 *        {number}   list[*].elementTypeId  - interactive element type (-1 if none)
 *        {Object[]} list[*].enabledSkills  - visible skills list
 *        {Object[]} list[*].disabledSkills - visible but inactive skills list
 */
IsoEngine.prototype.updateInteractiveElements = function (list) {
	this.mapRenderer.updateInteractiveElements(list);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Update obstacles on map
 *
 * @param {Object[]} obstacles                   - obstacles list
 *        {number}   obstacles[*].obstacleCellId - position of obstacle
 *        {number}   obstacles[*].state          - state (1: OPENED, 2: CLOSED)
 */
IsoEngine.prototype.updateObstacles = function (obstacles) {
	this.mapRenderer.updateObstacles(obstacles);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 *
 * @param {Object[]} statedElements - updated stated element
 *        {number} statedElements[*].elementId     - element id
 *        {number} statedElements[*].elementCellId - element position
 *        {number} statedElements[*].elementState  - element state
 */
IsoEngine.prototype.updateStatedElements = function (statedElements) {
	this.mapRenderer.updateStatedElements(statedElements);
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Adding an object on ground
 *
 * @param {Object[]} objects
 *        {number} objects[*].cellId cell id
 *        {number} objects[*].asset  (browser only) asset to display item
 *        {number} objects[*].uri    (native only) path to asset file on disc
 */
IsoEngine.prototype.addObjects = function (objects) {
	this.mapRenderer.addObjects(objects);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Remove an object from ground
 *
 * @param {number[]} cellIds - cell id
 */
IsoEngine.prototype.removeObjects = function (cellIds) {
	this.mapRenderer.removeObjects(cellIds);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

/** Call this right before adding a new arrow to take care of the cleanup
 *  Now = remove all other arrows
 *  ...and Later = once the timeout occurs we hide the arrows again
 */
IsoEngine.prototype._removeArrowsNowAndLater = function (timeout) {
	// we remove current arrows (and cancel plans to remove it later)
	this.removeArrows();
	if (this.arrowTimeout) {
		window.clearTimeout(this.arrowTimeout);
		this.arrowTimeout = null;
	}

	// arrows will also be removed after the given timeout
	var self = this;
	this.arrowTimeout = window.setTimeout(function () {
		self.arrowTimeout = null;
		self.removeArrows();
	}, timeout);
};

IsoEngine.prototype.addArrowOnCell = function (cellId, marginLeft, marginTop, arrowOrientation, nIterations) {
	this.mapRenderer.addArrowOnCell(cellId, marginLeft, marginTop, arrowOrientation, nIterations);
};

IsoEngine.prototype.addArrowOnGraphic = function (graphic, marginLeft, marginTop, arrowOrientation, nIterations) {
	this.mapRenderer.addArrowOnGraphic(graphic, marginLeft, marginTop, arrowOrientation, nIterations);
};

// will display the arrow one by one in a sequence
IsoEngine.prototype.addArrowsSequence = function (cellIds, marginLeft, marginTop, arrowOrientation) {
	this.mapRenderer.addArrowsSequence(cellIds, marginLeft, marginTop, arrowOrientation);
};

var ACTOR_ARROW = {
	upLeft:   { npc: [-0.3, -3],   monster: [-0.5, -2] },
	downLeft: { npc: [-0.5, -0.3], monster: [-0.5, +0.5] }
};

IsoEngine.prototype._addArrowOnActor = function (actor, isMonster, durationInMs) {
	var typeCharacter = isMonster ? 'monster' : 'npc';
	// Find where we want the arrow and its orientation.
	// If we had a way to retrieve the bounding box here, this would be perfect;
	// Since we do not, we use values that work "OK" in general. Note that Flash code has "80" hardcoded...
	var orientation = 'upLeft';
	var coords = ACTOR_ARROW[orientation][typeCharacter];
	var x = coords[0], y = coords[1];

	// Change orientation & position of the arrow if the target is on top of scene (arrow would be too high)
	if (actor.y + y < 60) { // 60 ~= arrow width is good enough to mean "too close to the top of the scene"
		orientation = 'downLeft';
		coords = ACTOR_ARROW[orientation][typeCharacter];
		x = coords[0];
		y = coords[1];
	}

	if (durationInMs) {
		this._removeArrowsNowAndLater(durationInMs);
	}
	this.mapRenderer.addArrowOnCell(actor.cellId, x * constants.CELL_WIDTH, y * constants.CELL_HEIGHT, orientation);
};

IsoEngine.prototype.addArrowOnNpc = function (npcId, durationInMs) {
	var actor = this.actorManager.getActorFromNpcId(npcId);
	if (!actor) { return console.warn('NPC not found with ID: ' + npcId); }
	this._addArrowOnActor(actor, /*isMonster=*/false, durationInMs);
};

IsoEngine.prototype.addArrowOnMonster = function (monsterId, durationInMs) {
	var actor = this.actorManager.getActorFromMonsterId(monsterId);
	if (!actor) { return console.warn('Monster not found with ID: ' + monsterId); }
	this._addArrowOnActor(actor, /*isMonster=*/true, durationInMs);
};

IsoEngine.prototype.removeArrows = function () {
	this.mapRenderer.removeArrows();
};

function highlightElement(element, nBlinks) {
	var fromHighlight = { red: 1, green: 1, blue: 1 };
	var toHighlight   = { red: 1.8, green: 1.8, blue: 1.8 };

	var tween = new Tween(element.highlight, ['red', 'green', 'blue']);
	tween.from(fromHighlight);
	for (var i = 0; i < nBlinks; i++) {
		tween.to(toHighlight, 12);
		tween.to(fromHighlight, 12);
	}
	tween.start();
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Highlight all interactives element in current map for a short time.
 *
 * @param {number} nBlinks - number of blinking highlight animation should have. default is 1.
 */
IsoEngine.prototype.highlightAllInteractives = function (nBlinks) {
	nBlinks = nBlinks || 1;
	var interactives = this.mapRenderer.interactiveElements;
	var elements     = this.mapRenderer.identifiedElements;

	var fightState = window.gui.fightManager.fightState;
	var isInFight  = fightState === FIGHT_STATES.PREPARATION || fightState === FIGHT_STATES.BATTLE;

	for (var id in interactives) {
		var interactive = interactives[id];
		var element     = elements[id];
		var isActor     = element instanceof Actor;
		if (!element) { continue; }
		if (isInFight && !isActor) { continue; }
		if (interactive.enabledSkills.length === 0 && interactive.disabledSkills.length === 0) { continue; }

		highlightElement(element, nBlinks);
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
IsoEngine.prototype.highlightInteractivesWithDifferentType = function () {
	var interactives = this.mapRenderer.interactiveElements;
	var elements     = this.mapRenderer.identifiedElements;

	var id, type;

	// get all interactive by type
	var elementsByType = {};
	for (id in interactives) {
		var interactive = interactives[id];
		var element     = elements[id];
		if (!element) { continue; }

		// don't consider interactive without skills NOR disabled ones (e.g. we did not equip the axe, etc.)
		if (interactive.enabledSkills.length === 0) { continue; }

		type = interactive.elementTypeId;
		if (!elementsByType[type]) { elementsByType[type] = []; }
		elementsByType[type].push(element);
	}

	var elementsToHighlight = [];
	for (type in elementsByType) {
		if (~~type === -1) {
			// these are generic interactives (e.g. door). All of them should be highlighted.
			elementsToHighlight = elementsToHighlight.concat(elementsByType[type]);
		} else {
			// for other interactive, only one is picked randomly.
			var len = elementsByType[type].length;
			var rnd = ~~(Math.random() * len);
			elementsToHighlight.push(elementsByType[type][rnd]);
		}
	}

	for (var i = 0; i < elementsToHighlight.length; i++) {
		highlightElement(elementsToHighlight[i], 5);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Display a numerical value animation on an actor (collect ressources result)
 *
 * @param {Object} msg - DisplayNumericalValueMessage, DisplayNumericalValueWithAgeBonusMessage
 */
IsoEngine.prototype.displayNumericalValue = function (msg) {
	var target = this.actorManager.getActor(msg.entityId);
	if (!target) { return console.error('No entity with id', msg.entityId); }

	var x = target.x;
	var y = target.y - 80;

	pointVariation.createPointVariationLabel({
		x: x, y: y,
		pointVariation: '+' + msg.value,
		color: [0.2, -0.1, -0.2, 0.0],
		maxRotation: 0.4
	});

	if (msg.valueOfBonus) {
		pointVariation.createPointVariationLabel({
			x: x, y: y,
			pointVariation: '+' + msg.valueOfBonus,
			color: [0.7, 0.0, -0.3, 0.0],
			maxRotation: 0.4,
			delay: 17
		});
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Display a numerical value animation on an actor (collect ressources result)
 *
 * @param {Object} msg - DisplayNumericalValueMessage, DisplayNumericalValueWithAgeBonusMessage
 */
var textBannerCount = 0; // Counter used as a z-indexing attribute to make sure new banner is on top of previous one
IsoEngine.prototype.displayTextBanner = function (textId) {
	if (!this.bitmapFonts || window.gui.fightManager.isInactive) {
		// bitmap font not loaded yet or player is inactive
		return;
	}

	var text = getText(textId);
	var fallbackText = getTextFailover(textId);

	var scene = this.mapScene;
	var x = scene.w / 2;
	var y = scene.h / 2;

	var bitmapFont = this.bitmapFonts.characters;
	var textSprite = new TextSprite({
		x: x,
		y: y,
		scene: scene,
		text: text,
		fallbackText: fallbackText,
		position: 2 * textBannerCount + 1,
		layer: constants.MAP_LAYER_POINT_LABELS,
		bitmapFont: bitmapFont,
		color: [0.2,  0.5, -0.2, 0.0],
		isHudElement: true
	});

	var bannerDimensions = bitmapFont.dimensions.bann;

	var textWidth  = textSprite.textWidth;
	var textHeight = textSprite.textHeight;
	var textureHeight = bannerDimensions.h;
	var textureWidth  = bannerDimensions.w;

	var midWidth = 2;
	var leftWidth = Math.floor(textureWidth / 2 - midWidth);

	var u = bannerDimensions.x;
	var v = bannerDimensions.y;

	var bannerBack = new Grid9Graphic({
		x: x,
		y: y - textHeight / 2,
		scene: scene,
		position: 2 * textBannerCount,
		layer: constants.MAP_LAYER_POINT_LABELS,
		texture: bitmapFont.texture,
		controlPoints: [
			{ x: -textWidth / 2 - leftWidth, u: u,                        y: 0,             v: v },
			{ x: -textWidth / 2,             u: u + leftWidth,            y: 0,             v: v },
			{ x:  textWidth / 2,             u: u + leftWidth + midWidth, y: textureHeight, v: v + textureHeight },
			{ x:  textWidth / 2 + leftWidth, u: u + textureWidth,         y: textureHeight, v: v + textureHeight }
		],
		isHudElement: true
	});

	var bannerTextTween = new Tween(textSprite, ['y', 'alpha'])
		.from({ y: y - 30, alpha: 0.0 })
		.to({ y: y - 30, alpha: 0.0 }, 4) // tempo
		.to({ y: y, alpha: 1.0 }, 8, easing.backOut, 2)
		.to({ y: y, alpha: 1.0 }, 17)
		.to({ y: y - 30, alpha: 0.0 }, 8, easing.backIn, 2)
		.onFinish(function () {
			textSprite.remove();
		})
		.start();

	var bannerBackTween = new Tween(bannerBack, ['scaleX', 'alpha'])
		.from({ scaleX: 0.7, alpha: 0.0 })
		.to({ scaleX: 1.0, alpha: 1.0 }, 8, easing.backOut, 2)
		.to({ scaleX: 1.0, alpha: 1.0 }, 24)
		.to({ scaleX: 0.7, alpha: 0.0 }, 8, easing.backIn, 2)
		.onFinish(function () {
			bannerBack.remove();
		})
		.start();

	textBannerCount += 1;

	if (this._currentBannerTweens.backTween !== null &&
		(this._currentBannerTweens.backTween.starting || this._currentBannerTweens.backTween.playing)) {
		// If a banner was already showing, fading it out
		// It avoids having two banners overlapping
		this._currentBannerTweens.backTween.reset()
			.to({ scaleX: 0.7, alpha: 0.0 }, 8, easing.polyOut, 2)
			.start();

		this._currentBannerTweens.textTween.reset()
			.to({ y: y - 30, alpha: 0.0 }, 8, easing.polyOut, 2)
			.start();
	}

	this._currentBannerTweens.backTween = bannerBackTween;
	this._currentBannerTweens.textTween = bannerTextTween;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @param {number} id - actor ID
  * @param {number} [durationInTups] */
IsoEngine.prototype.highlightActorOnAction = function (id, durationInTups) {
	var actor = this.actorManager.getActor(id);
	if (!actor) {
		return console.warn('Actor with id ' + id + ' to highlight not found.');
	}
	this._addHighlight(actor);
	this.clearHighlights(durationInTups || INSTANT_HIGHLIGHT_DURATION);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
IsoEngine.prototype.interactiveDisconnect = function () {
	var keys = Object.keys(interactiveUseWaitingForServer);
	for (var i = 0; i < keys.length; i++) {
		window.clearTimeout(interactiveUseWaitingForServer[keys[i]]);
		delete interactiveUseWaitingForServer[keys[i]];
	}
	this.actionQueue.clear();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/IsoEngine/interactive.js
 ** module id = 1048
 ** module chunks = 0
 **/