
var SCREEN_MARGIN = 5; // px from map's border
var RANDOM_POS_AMOUNT = 5; // px; +/- this number so range is twice this value

/** boxType values */
var TYPE_OBSTACLE = 0;
var TYPE_MYSELF = 1;
var TYPE_NPC = 2;
var TYPE_ACTOR = 3; // all other actors than myself
var TYPE_BUBBLE = 4;

/**
 * Priorities used for boxes "weight" computations, i.e. decide if a bubble can overlap certain things.
 * 0 is the biggest priority possible, then 1, 2, etc.
 */
var BOX_PRIORITY = {};
BOX_PRIORITY[TYPE_OBSTACLE] = 1;
BOX_PRIORITY[TYPE_MYSELF] =  10;
BOX_PRIORITY[TYPE_NPC] =     20;
BOX_PRIORITY[TYPE_ACTOR] =   30;

var SUBBOX_PRIORITY = {};
SUBBOX_PRIORITY[TYPE_NPC] =     50;
SUBBOX_PRIORITY[TYPE_ACTOR] =  200;
SUBBOX_PRIORITY[TYPE_MYSELF] = 400;


function BoxArranger() {
	this._setDimensions(0, 0, 0, 0);
	this.clear();
	this.lastUpdateTime = 0;
}
module.exports = BoxArranger;


BoxArranger.prototype.initialize = function (originX, originY, width, height) {
	this._setDimensions(originX, originY, width, height);
	this.clear();

	var self = this;
	window.gui.on('resize', function (dimensions) {
		self._setDimensions(dimensions.mapLeft, dimensions.mapTop, dimensions.mapWidth, dimensions.mapHeight);
	});
	window.isoEngine.on('mapLoaded', function (options) {
		if (options && options.isReload) { return; }
		self.clear();
	});
};

BoxArranger.prototype.clear = function () {
	this.boxes = [];
};

BoxArranger.prototype._setDimensions = function (originX, originY, width, height) {
	this.originX = originX;
	this.originY = originY;
	this.width = width;
	this.height = height;
};

function Box(x, y, width, height, boxType, actorId) {
	this.x = x;
	this.y = y;
	this.width = width;
	this.height = height;
	this.boxType = boxType;
	this.actorId = actorId;

	this.priority = BOX_PRIORITY[boxType];
	this.angle = null;
}

Box.prototype.intersectingSurface = function (r2) {
	if (r2.x + r2.width <= this.x  || r2.x >= this.x + this.width) { return 0; }
	if (r2.y + r2.height <= this.y  || r2.y >= this.y + this.height) { return 0; }

	var w = Math.min(this.x + this.width,  r2.x + r2.width)  - Math.max(this.x, r2.x);
	var h = Math.min(this.y + this.height, r2.y + r2.height) - Math.max(this.y, r2.y);

	return w * h;
};

Box.prototype.setAsSubboxOf = function (target) {
	this.priority = SUBBOX_PRIORITY[target.boxType];

	var x1 = this.x + this.width / 2;
	var y1 = this.y + this.height / 2;
	var x2 = target.x + target.width / 2;
	var y2 = target.y + target.height / 2;
	this.angle = Math.atan2(y2 - y1, x2 - x1);
};

Box.prototype.getCenter = function () {
	return [this.x + this.width / 2, this.y + this.height / 2];
};


var NUM_VALID_POS = 4;
var HORIZ_OVERLAP = 10; // px "overlap" to make bubble a bit closer to actor

// Generate a valid position of box around target.
// Current algo is only allowing 4 positions indexed by "i".
// This could be extended to try regularly spaced positions around the target box's sides.
BoxArranger.prototype._moveBoxAround = function (box, target, index) {
	var x, y;
	switch (index) {
	case 0:
		x = target.x + target.width - HORIZ_OVERLAP;
		y = target.y - box.height;
		break;
	case 1:
		x = target.x - box.width + HORIZ_OVERLAP;
		y = target.y - box.height;
		break;
	case 2:
		x = target.x - box.width + HORIZ_OVERLAP;
		y = target.y + target.height;
		break;
	case 3:
		x = target.x + target.width - HORIZ_OVERLAP;
		y = target.y + target.height;
		break;
	default: return console.error(new Error('invalid _moveBoxAround index' + index));
	}
	box.x = Math.round(x);
	box.y = Math.round(y);
};

BoxArranger.prototype._computeWeight = function (box, target, maxWeight) {
	if (box.x < this.originX + SCREEN_MARGIN || box.y < this.originY + SCREEN_MARGIN) { return Infinity; }
	if (box.x + box.width > this.originX + this.width - SCREEN_MARGIN ||
		box.y + box.height > this.originY + this.height - SCREEN_MARGIN) { return Infinity; }

	var weight = 0;
	for (var i = this.boxes.length - 1; i >= 0; i--) {
		var b = this.boxes[i];
		if (b === target) { continue; }
		var intersect = box.intersectingSurface(b);
		if (!intersect) { continue; }
		if (!b.priority) { return Infinity; }
		weight += intersect / b.priority;
		if (weight >= maxWeight) { return weight; } // quit computing if we are already over max
	}
	return weight;
};

BoxArranger.prototype._addBoxNextToTarget = function (target, boxWidth, boxHeight) {
	var box = new Box(0, 0, boxWidth, boxHeight, TYPE_BUBBLE);

	var bestWeight = Infinity, bestIndex = 0;
	for (var i = 0; i < NUM_VALID_POS; i++) {
		this._moveBoxAround(box, target, i);
		var weight = this._computeWeight(box, target, bestWeight);
		if (weight < bestWeight) {
			bestWeight = weight;
			bestIndex = i;
			if (weight === 0) { break; }
		}
	}
	if (bestWeight !== 0) { this._moveBoxAround(box, target, bestIndex); }

	// Add some randomness so 2 bubbles on same spot are less often on same pixel (looks more like a stack)
	box.x += RANDOM_POS_AMOUNT * 2 * (Math.random() - 0.5);
	box.y += RANDOM_POS_AMOUNT * 2 * (Math.random() - 0.5);

	box.setAsSubboxOf(target);
	this.boxes.push(box);
	return box;
};

function getActorBbox(actor) {
	var bbox = actor.bbox;
	if (bbox[0] <= bbox[1]) { return bbox; }
	// Create an aproximated bbox - no need to be perfect, this will be super rare
	var coords = window.isoEngine.mapRenderer.getCellSceneCoordinate(actor.cellId);
	return [coords.x - 20, coords.x + 20, coords.y - 90, coords.y + 10];
}

BoxArranger.prototype._newActorBox = function (actor, boxType) {
	var foreground = window.foreground;

	var bbox = getActorBbox(actor);
	var actorTopLeft = foreground.convertSceneToScreenCoordinate(bbox[0], bbox[2]);
	var actorBottomRight = foreground.convertSceneToScreenCoordinate(bbox[1], bbox[3]);

	var actorWidth = actorBottomRight.x - actorTopLeft.x;
	var actorHeight = actorBottomRight.y - actorTopLeft.y;

	var box = new Box(actorTopLeft.x, actorTopLeft.y, actorWidth, actorHeight, boxType, actor.actorId);
	this.boxes.push(box);
	return box;
};

BoxArranger.prototype.addBoxNextToActor = function (actor, wuiDom) {
	this._updateActors();

	var actorBox = this._getActorBox(actor);
	if (!actorBox) {
		actorBox = this._newActorBox(actor, TYPE_ACTOR); // fallback by creating the actor now
	}

	var element = wuiDom.rootElement;
	return this._addBoxNextToTarget(actorBox, element.clientWidth, element.clientHeight);
};

BoxArranger.prototype.addObstacle = function (x, y, width, height) {
	var b = new Box(x, y, width, height, TYPE_OBSTACLE);
	this.boxes.push(b);
	return b;
};

BoxArranger.prototype.removeBox = function (box) {
	var ndx = this.boxes.indexOf(box);
	if (ndx < 0) { return; }
	this.boxes.splice(ndx, 1);
};

BoxArranger.prototype._removeActors = function () {
	var newList = [];
	for (var i = this.boxes.length - 1; i >= 0; i--) {
		var b = this.boxes[i];
		if (!b.actorId) { // anything without an actorId is kept
			newList.push(b);
		}
	}
	this.boxes = newList;
};

BoxArranger.prototype._updateActors = function () {
	this.lastUpdateTime = Date.now();

	this._removeActors();

	this._newActorBox(window.actorManager.userActor, TYPE_MYSELF);

	var actors = window.actorManager.actors;
	for (var id in actors) {
		var actor = actors[id];
		var actorData = actor.data;
		if (!actorData || actorData.staticInfos) { continue; } // skip monsters and incomplete actors

		this._newActorBox(actor, actorData.npcId ? TYPE_NPC : TYPE_ACTOR);
	}
};

BoxArranger.prototype._getActorBox = function (actor) {
	var actorId = actor.actorId;
	for (var i = this.boxes.length - 1; i >= 0; i--) {
		var b = this.boxes[i];
		if (b.actorId === actorId) { return b; }
	}
	return null;
};


//



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/BoxArranger/index.js
 ** module id = 434
 ** module chunks = 0
 **/