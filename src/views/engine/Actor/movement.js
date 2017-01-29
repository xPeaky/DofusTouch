var Actor       = require('./main.js');
var constants   = require('constants');
var atouin      = require('atouin');
var GameContext = require('GameContextEnum');

var TIME_UNITS_PER_SECOND = constants.TIME_UNITS_PER_SECOND;

var ANIM_DURATION = {
	mounted: { linear: 135, horizontal: 200, vertical: 120, symbolId: 'AnimCourse' },
	parable: { linear: 400, horizontal: 500, vertical: 450, symbolId: 'FX' },
	running: { linear: 170, horizontal: 255, vertical: 150, symbolId: 'AnimCourse' },
	walking: { linear: 480, horizontal: 510, vertical: 425, symbolId: 'AnimMarche' },
	slide:   { linear:  57, horizontal:  85, vertical:  50, symbolId: 'AnimStatique' }
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Actor.prototype.setCellPosition = function (cellId) {
	// Removing actor from previous position
	this.actorManager.removeActorOccupation(this);

	// Adding actor at new position
	this.cellId = cellId;
	this.actorManager.addActorOccupation(this);

	if (this.carriedActor) { this.carriedActor.setCellPosition(cellId); }
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Actor.prototype.setOnScreenPosition = function (position) {
	var isoEngine = this.actorManager.isoEngine;
	var isFight   = isoEngine.gameContext === GameContext.FIGHT;
	var map       = isoEngine.mapRenderer.map;
	var coord     = atouin.cellCoord[position];
	var altitude  = 0;

	if (map) {
		if (!isFight) {
			altitude = map.cells[position].f || 0;
		} else {
			this._positionCircle();
		}
	}

	this.position = position;

	this.x = coord.x;
	this.y = coord.y - altitude;

	this._positionIcons();
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set actor position and direction.
 *
 * @param {number} [position]  - cellId where actor is standing. Optional.
 * @param {number} [direction] - direction actor is facing, integer in the range [0..7]
 */
Actor.prototype.setDisposition = function (position, direction) {
	// cancel current movement
	if (this.moving) {
		this.pathTween.removeOnFinish();
		this.pathTween.stop();
		if (this.isLocked) { this.isLocked = false; }
	}

	if ((position || position === 0) && position !== -1) {
		this.setOnScreenPosition(position);
		this.setCellPosition(position);
	}

	if (direction || direction === 0) {
		this.direction = direction;
	}

	if (!this.animated) {
		this.staticAnim();
	}

	this.step = 0;
	this.path = [];
	this.moving = false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Actor current movement is canceled by server. */
Actor.prototype.noMovement = function () {
	if (!this.moving) { return; }

	this.pathTween.removeOnFinish();
	this.pathTween.stop();

	this.moving = false;
	if (this.isLocked) { this.isLocked = false; }
	this.step = 0;
	this.path = [];
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Actor current movement is canceled by user */
Actor.prototype.cancelMovement = function (cb) {
	var self = this;

	// cancel current movement animation
	this.pathTween.removeOnFinish();
	this.pathTween.stop();

	// finish the current step
	var step = ~~this.step;
	var lastStep = step + 1;
	var duration = this.path[step].m * (1 - this.step + step);
	var position = this.path[lastStep].c;

	this.pathTween.reset().from({ step: this.step }).to({ step: lastStep }, duration);
	this.pathTween.start(false);
	this.pathTween.onceFinish(function () {
		self.moving = false;
		self.step   = 0;
		self.path   = [];
		// set character to current position
		self.setCellPosition(position);

		// if the actor is the player's character
		if (self.actorId === window.gui.playerData.id) {
			// request server to cancel movement
			window.dofus.sendMessage('GameMapMovementCancelMessage', { cellId: position });
		}

		if (cb) {
			cb();
		}

		// Callback was not a movement, stop the character
		if (!self.moving) {
			self.setDisposition(position);
		}
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Actor current movement is replaced by another path */
Actor.prototype.switchPath = function (newPath, cb) {
	var self = this;

	// cancel current movement animation
	this.pathTween.removeOnFinish();
	this.pathTween.stop();

	// finish the current step
	var step = ~~this.step;
	var lastStep = step + 1;
	var duration = this.path[step].m * (1 - (this.step - step));
	this.pathTween.reset().from({ step: this.step }).to({ step: lastStep }, duration);
	this.pathTween.start(false);
	this.pathTween.onceFinish(function () {
		self.moving = false;
		self.step   = 0;
		self.path   = [];

		if (newPath.length === 1) {
			self.setDisposition(newPath[0]);
			return cb();
		}

		self.setPath(newPath, { cb: cb });
		self.setCellPosition(newPath[newPath.length - 1]);
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Reconciles user actor's path with serverPath; returns false if actor's path does not match,
 *  in which case newPath will contain the new path to make the server happy.
 *  If there is no way to make the server happy, newPath will be returned empty.
 */
Actor.prototype.isPathMatchingServerPath = function (serverPath, newPath) {
	var finalPosition = serverPath[serverPath.length - 1];
	var path = this.path;
	// Received path and current path have same final position, we consider current path correct
	if (path[path.length - 1].c === finalPosition) {
		return true;
	}
	var finalStepIndex;
	for (finalStepIndex = path.length - 2; finalStepIndex >= 0; finalStepIndex--) {
		if (path[finalStepIndex].c === finalPosition) {
			break;
		}
	}
	var currentStepIndex = ~~this.step;
	// Final position of the received path could not be found in current path, or actor already went past it
	// So user is forced to be positioned at the final position of the received path
	if (currentStepIndex >= finalStepIndex) {
		return false;
	}
	// New user path is received path starting from the user's position at the end of its current path step
	var startPosition = path[currentStepIndex + 1].c;
	for (var i = serverPath.length - 1; i >= 0; i--) {
		newPath.unshift(serverPath[i]);
		if (serverPath[i] === startPosition) {
			break;
		}
	}
	return false;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Set actor properties accordingly to step position
 */
Actor.prototype.refreshAnimation = function (areasToRefresh) {
	if (this.moving === true) {
		var s = ~~this._step;
		var r = this._step - s;

		var beforePos = this.path[s];
		if (beforePos) {
			var afterPos = this.path[s + 1] || this.path[s];

			this._x = beforePos.x + (afterPos.x - beforePos.x) * r;
			this._y = beforePos.y + (afterPos.y - beforePos.y) * r;

			if (r > 0.5 && this._position !== afterPos.c) {
				this.position = afterPos.c;
			}

			if (this.animSymbol.id !== beforePos.a.id || this.direction !== beforePos.d) {
				// update animManager with the new animSymbol
				this.animSymbol = beforePos.a;
				this.direction  = beforePos.d;
				this.animManager.assignSymbol(this.animSymbol, true);
			}
		}
	}

	this._refreshAnimation(areasToRefresh);
	this._positionIcons();
	this._positionCircle();
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Prepare and start animation to move the character on a path
 *
 * @param {Function} [cb] - optional asynchronous callback function to call when movement animation is finished.
 */
Actor.prototype._startPath = function (cb) {
	var self = this;
	var path = this.path;

	var duration = path[0].m;

	this.step = 0;
	this.pathTween.reset().from({ step: 0 }).to({ step: 1 }, duration);
	for (var i = 1, len = this.path.length - 1; i < len; i++) {
		duration = path[i].m;
		this.pathTween.to({ step: i + 1 }, duration);
	}

	if (!this.animManager.isTemporary) {
		this.animSymbol = path[0].a;
		this.animManager.assignSymbol(this.animSymbol, true);
	}

	if (this.moving) {
		console.warn('[Actor._startPath] error: actor "' + this.actorId + '" is already moving.');
	} else {
		this.pathTween.start(false);
		this.pathTween.onceFinish(function () {
			self.moving  = false;

			var lastStep = self.path[self.path.length - 1];
			self.animSymbol = lastStep.a;
			self._x = lastStep.x;
			self._y = lastStep.y;
			self.animManager.assignSymbol(self.animSymbol, false);

			// TODO : acknowledge MapInterface that animation for this actor has stopped
			return cb && cb();
		});
	}

	this.moving = true;
};

function PassingPoint(cellId, x, y, direction, animSymbol, duration) {
	this.c = cellId;
	this.x = x;
	this.y = y;
	this.d = direction;
	this.a = animSymbol;
	this.m = duration;
}

Actor.prototype.walkToSceneCoordinate = function (x, y, direction, duration, cb) {
	var animSymbolMarche   = this.getAnimSymbol('AnimMarche', direction);
	var animSymbolStatique = this.getAnimSymbol('AnimStatique', direction);
	this.path = [
		new PassingPoint(this.cellId, this._x, this._y, direction, animSymbolMarche, duration),
		new PassingPoint(this.cellId, x, y, direction, animSymbolStatique, 0)
	];
	this._startPath(cb);
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Precalculate path animation from a path returned by path finder
 *
 * @param {number[]} path                - an array of cell ids
 * @param {object}   [options]
 *        {boolean}  [options.slide]     - atouin map Object (needed for the cells altitude)
 *        {boolean}  [options.forceWalk] - to avoid automatic run animation
 *        {function} [options.cb]        - movement end callback
 *
 * TODO: if there is no direction change between 2 segment, the animation can possibly be
 *       simplified: remove a transition, but make the previous transition longer.
 *       (need to refactor the zindex inbetween step calculation)
 */
Actor.prototype.setPath = function (path, options) {
	var cb = options && options.cb;

	var isoEngine = this.actorManager.isoEngine;
	if (!isoEngine.mapRenderer.isReady) {
		console.warn('setPath: renderer was not ready');
		return cb();
	}

	if (path.length <= 1) { return cb && cb(); }

	var slide = options && options.slide;
	var forceWalk = options && options.forceWalk;

	// pre-calculate path coordinates
	this.path = [];
	this.step = 0;
	var previousPath;
	var prevX;
	var prevY;

	var isFight   = isoEngine.gameContext === GameContext.FIGHT;
	var cells     = isoEngine.mapRenderer.map.cells;
	var motionScheme;
	if (slide) {
		motionScheme = ANIM_DURATION.slide;
	} else if (this.isRiding) {
		motionScheme = ANIM_DURATION.mounted;
	} else {
		motionScheme = (path.length > 3 && !forceWalk) ? ANIM_DURATION.running : ANIM_DURATION.walking;
	}


	var direction;

	// speed adjustement
	// TODO: do calculation in constructor.
	var speedAdjust = ((1 + this.speedAdjust / 10) || 0.001) * TIME_UNITS_PER_SECOND;

	for (var i = 0; i < path.length; i++) {
		var cellId = path[i];

		var altitude = isFight ? 0 : cells[cellId].f || 0;

		// get coordinates
		var coord = atouin.cellCoord[cellId];
		var duration;

		// get direction
		if (i === 0) {
			direction = 1;
		} else {
			if (coord.y === prevY) {
				// move horizontaly
				duration = motionScheme.horizontal;
				direction = coord.x > prevX ? 0 : 4;
			} else if (coord.x === prevX) {
				// move verticaly
				duration = motionScheme.vertical;
				direction = coord.y > prevY ? 2 : 6;
			} else {
				// move in diagonal
				duration = motionScheme.linear;
				if (coord.x > prevX) {
					direction = coord.y > prevY ? 1 : 7;
				} else {
					direction = coord.y > prevY ? 3 : 5;
				}
			}
		}

		// adjust duration with actor's speedAdjust
		duration = duration / speedAdjust;

		// if sliding, don't change direction
		if (slide) { direction = this.direction; }

		var animSymbol = this.getAnimSymbol(motionScheme.symbolId, direction);

		// TODO: should be a better way to do
		if (i > 0) {
			previousPath.d = direction;
			previousPath.a = animSymbol;
			previousPath.m = duration;
		}

		// store step
		this.path.push(new PassingPoint(cellId, coord.x, coord.y - altitude, direction, animSymbol, duration));

		// remember previous path step for direction calculation
		previousPath = this.path[this.path.length - 1];
		prevX = coord.x;
		prevY = coord.y;
	}

	// check if actor animManager has special transition animation symbol
	var animManager = this.animManager;
	var exposedSymbols = (animManager.isTemporary) ? {} : animManager.template.exposedSymbols;
	var symbolEnd = this.getAnimSymbol('AnimStatique', direction);
	var symbolIn  = this.getAnimSymbol('AnimStatique_to_' + this.path[0].a.base, this.path[0].a.direction);
	var symbolOut = this.getAnimSymbol(motionScheme.symbolId + '_to_' + symbolEnd.base, direction);
	var step, symbolDuration;
	if (exposedSymbols[symbolIn.id]) {
		step = this.path[0];
		symbolDuration = animManager.getSymbolDuration(symbolIn.id);
		// add transition step at begining of animation
		this.path.unshift(new PassingPoint(step.c, step.x, step.y, step.d, symbolIn, symbolDuration));
	}

	if (exposedSymbols[symbolOut.id]) {
		step = this.path[this.path.length - 1];
		symbolDuration = animManager.getSymbolDuration(symbolOut.id);
		// transform last step to transition step
		step.a = symbolOut;
		step.m = symbolDuration;
		// add ending step with static animation
		this.path.push(new PassingPoint(step.c, step.x, step.y, step.d, symbolEnd, step.m));
	}

	// last step of animation should be a static animation
	this.path[this.path.length - 1].a = symbolEnd;

	this._startPath(cb);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Actor/movement.js
 ** module id = 611
 ** module chunks = 0
 **/