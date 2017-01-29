var GridFeedbackOverlay  = require('GridFeedbackOverlay');
var GridAnimationLayer   = require('GridAnimationLayer');
var DoublyList           = require('container-doublylist');
var CellInfo             = require('CellInfo');
var transformStates      = require('transformStates');

// Because we only have one set of sprite boxes, we use that almost like the pixels on a computer screen.
// So then when you have multiple animations, stacked on one another, how do you manage the transition between states?
// What if you have several effects that are animating at the same time, and are in different states.
// What happens when one effect disappears, what if it is overlapped with other animations.  How do you determine the
// state you need to animate to?

// My answer to these questions was forming virtual layers of target animation state.
// This makes it conceptually simple to visualise and manage that animating state of each grid box.
// It also makes the code simple.

// every time you want to apply a state to a cell, you need 2 things.  The desired ending state, and the type of
// animation to get to it, both are specifiable per cell.

// each effect spans a number of cells, has a particular color and animation.  It is logical to group these cells
// together into a layer, these are what the GridAnimationLayers are.
// When layers are added, they are added to the top.
// When layers are removed, the target state for all cells is recalculated.

//TODO: change all cellInfo objects to arrays
function GridAnimator() {
	this._gridOverlay = new GridFeedbackOverlay();
	this._gridOverlay.hide();
	this._layers = new DoublyList();
	this._layersBeingRemoved = new DoublyList();
}
module.exports = GridAnimator;

GridAnimator.prototype.addGridAnimation = function (cellInfos) {
	if (Object.keys(cellInfos).length === 0) {
		console.error('Trying to add animation with no cells!');
		return null;
	}

	this._gridOverlay.show();

	var layer = new GridAnimationLayer(cellInfos, this._gridOverlay);
	layer.playAnimation();

	layer._listReference = this._layers.addFront(layer);
	this._resetBoundingBox();

	return layer;
};

GridAnimator.prototype.removeGridLayer = function (layerToRemove) {
	if (!layerToRemove) {
		return;
	}

	this._layers.removeByReference(layerToRemove._listReference);
	layerToRemove._listReference = null;

	var removedCellInfos = layerToRemove.cellInfos;
	var cellIds = Object.keys(removedCellInfos);

	var c, cellId;
	var constructedCellInfos = {};
	for (var layerReference = this._layers.first; layerReference !== null; layerReference = layerReference.next) {
		for (c = 0; c < cellIds.length; c++) {
			cellId = cellIds[c];
			if (layerReference.object.cellInfos[cellId] && constructedCellInfos[cellId] === undefined) {
				constructedCellInfos[cellId] = layerReference.object.cellInfos[cellId];
			}
		}
	}

	for (c = 0; c < cellIds.length; c++) {
		cellId = cellIds[c];
		var removedCell = removedCellInfos[cellId];
		if (constructedCellInfos[cellId] === undefined) {
			constructedCellInfos[cellId] = new CellInfo(
				cellId,
				removedCell.distanceToPlayer,
				transformStates.empty
			);
		}
	}

	layerToRemove._listReference = this._layersBeingRemoved.add(layerToRemove);

	var self = this;
	var removalAnimationLayer = new GridAnimationLayer(constructedCellInfos, this._gridOverlay);
	removalAnimationLayer.playAnimation(function removeLayer() {
		self._resetBoundingBox();
		self._layersBeingRemoved.removeByReference(layerToRemove._listReference);
		layerToRemove._listReference = null;
	});
};

GridAnimator.prototype._resetBoundingBox = function () {
	this._gridOverlay._bbox = [Infinity, -Infinity, Infinity, -Infinity]; // reset bbox

	for (var layerRef = this._layersBeingRemoved.first; layerRef !== null; layerRef = layerRef.next) {
		this._expandToFitBox(layerRef.object);
	}

	if (this._layers.length === 0) {
		this._gridOverlay.hide();
	} else {
		if (this._layers.length > 64) {
			console.error('layers are likely leaking');
		}

		for (layerRef = this._layers.first; layerRef !== null; layerRef = layerRef.next) {
			this._expandToFitBox(layerRef.object);
		}
	}
};

GridAnimator.prototype.clear = function () {
	this._layers.clear();
};

GridAnimator.prototype._expandToFitPoint = function (x, y) {
	var bbox = this._gridOverlay._bbox;

	if (bbox[0] > x) {
		bbox[0] = x;
	}

	if (bbox[2] > y) {
		bbox[2] = y;
	}

	if (bbox[1] < x) {
		bbox[1] = x;
	}

	if (bbox[3] < y) {
		bbox[3] = y;
	}
};

GridAnimator.prototype._expandToFitBox = function (layer) {
	var bbox = this._gridOverlay._bbox;

	var x0 = layer.bbox[0] - 43;
	if (x0 < bbox[0]) {
		bbox[0] = x0;
	}

	var x1 = layer.bbox[1] + 43;
	if (x1 > bbox[1]) {
		bbox[1] = x1;
	}

	var y0 = layer.bbox[2] - 22;
	if (y0 < bbox[2]) {
		bbox[2] = y0;
	}

	var y1 = layer.bbox[3] + 22;
	if (y1 > bbox[3]) {
		bbox[3] = y1;
	}
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/grid/GridAnimator/index.js
 ** module id = 1023
 ** module chunks = 0
 **/