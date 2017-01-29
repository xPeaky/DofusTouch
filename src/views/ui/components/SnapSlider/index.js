require('./styles.less');
var inherits = require('util').inherits;
var getPosition = require('tapHelper').getPosition;
var WuiDom = require('wuidom');
var Button = require('Button');
var interactionHandler = require('interactionHandler');

// const
var DEFAULT_NUM_SNAPS = 3;
var DEFAULT_NUM_GRIPS = 1;
var HALF_SNAP_WIDTH = 7;
var HALF_GRIP_WIDTH = 14;
var SNAP_THRESHOLD = 5;

// class
function SnapSlider(options) {
	WuiDom.call(this, 'div', { className: 'SnapSlider', name: options.name || '' });
	options = options || {};

	this.isRange = !!options.isRange;
	if (this.isRange) { this.addClassNames('range'); }

	// properties
	this.numSnaps = options.numSnaps || DEFAULT_NUM_SNAPS;
	this.numGrips = options.numGrips || DEFAULT_NUM_GRIPS;

	// ui
	this.rail = {};
	this.grips = {}; // id: dom, snapId
	this.snaps = {};

	// init
	this._setupRail();
	this._setupSnaps();
}

inherits(SnapSlider, WuiDom);
module.exports = SnapSlider;

// private
SnapSlider.prototype._setupRail = function () {
	var self = this;

	this.rail = this.createChild('div', { className: 'rail' });

	this._railBox = null;

	var leftBound, rightBound, startPosX, slideStarted, slideInitialised;

	function setClosestSnap() {
		if (!slideInitialised) { return; }
		slideInitialised = false;
		self.removeListener('dom.touchmove', slideGrip);

		if (!slideStarted) { return; }
		slideStarted = false;
		self.delClassNames('sliding');

		var grip = self.activeGrip;
		if (!grip) { // already finished moving
			return;
		}

		var closestSnap = self.getClosestSnap(grip);
		self.setGrip(closestSnap.id, grip.id);
	}

	function slideGrip(evt) {
		if (!slideInitialised) { return; }
		var grip = self.activeGrip;
		if (!grip) { return; }

		var newPosX = getPosition(evt).x - self._railBox.left;
		if (!slideStarted) {
			if (Math.abs(startPosX - newPosX) < SNAP_THRESHOLD) {
				return;
			}

			if (!interactionHandler.requestInteractionHandle(self)) {
				return setClosestSnap();
			}
			self.addClassNames('sliding');
			slideStarted = true;
		}

		if (newPosX < leftBound) {
			newPosX = leftBound;
		} else if (newPosX > rightBound) {
			newPosX = rightBound;
		}

		// update position
		grip.delClassNames('transition');
		grip.setStyle('webkitTransform', 'translate3d(' + (newPosX) + 'px, 0, 0)');
		grip.x = newPosX;
		grip.snapId = self.getClosestSnap(grip).id;

		if (self.isRange) { self._updateRangeDisplay(); }

		self.emit('slideGrip', grip.id, newPosX);
	}

	function startSlide(evt) {
		if (slideInitialised) { return; }
		slideInitialised = true;

		self._railBox = self.rail.rootElement.getBoundingClientRect();
		startPosX = getPosition(evt).x - self._railBox.left;
		self.activeGrip = self._getClosestGrip(startPosX);

		var leftGrip = self.grips[self.activeGrip.id - 1];
		leftBound = leftGrip && (leftGrip.x + HALF_GRIP_WIDTH) || 0;

		var rightGrip = self.grips[self.activeGrip.id + 1];
		rightBound = rightGrip && (rightGrip.x + HALF_GRIP_WIDTH) || self._railBox.width;

		self.on('dom.touchmove', slideGrip);
	}

	// gestures
	this.allowDomEvents();
	this.on('dom.touchstart', startSlide);
	this.on('dom.touchend', setClosestSnap);
};

SnapSlider.prototype._setupSnaps = function () {
	var self = this;

	function setGrip() {
		if (!interactionHandler.isHandleFree()) { return; }
		var grip = self._getClosestGrip(this.x);
		self.setGrip(this.id, grip.id);
	}

	var i;
	var interval = 100 / (this.numSnaps - 1); // e.g. 3 snaps, spaced 50% apart
	for (i = 0; i < this.numSnaps; i += 1) {
		var snap = this.snaps[i] = this.rail.appendChild(new Button({ className: 'snap' }, setGrip));
		snap.createChild('div', { className: 'display' });
		snap.id = i;
		snap.x = 0;
		snap.setStyle('left', (interval * i) + '%');
	}
	for (i = 0; i < this.numGrips; i += 1) {
		var grip = this.grips[i] = this.createChild('div', { className: 'grip', name: 'grip' + i });
		grip.createChild('div', { className: 'display' });
		grip.id = i;
		grip.x = 0;
	}
};

SnapSlider.prototype._getClosestGrip = function (x) {
	var closestGrip;
	var smallestDistance = this._railBox.width;

	for (var id in this.grips) {
		var grip = this.grips[id];
		var distance = Math.abs(grip.x - x);

		if (distance <= smallestDistance || !closestGrip) {
			smallestDistance = distance;
			closestGrip = grip;
		}
	}

	return closestGrip;
};

SnapSlider.prototype._initSlider = function () {
	this._railBox = this.rail.rootElement.getBoundingClientRect();
	var snapGapWidth = this._railBox.width / (this.numSnaps - 1);
	for (var id in this.snaps) {
		var snap = this.snaps[id];
		snap.x = Math.floor(snapGapWidth * snap.id);
		snap.setStyle('left', (snap.x - HALF_SNAP_WIDTH) + 'px');
	}
};

SnapSlider.prototype.setGrip = function (snapId, gripId, isSilent) {
	if (snapId < 0 || snapId > this.numSnaps - 1) {
		return;
	}

	if (!this._railBox) { this._initSlider(); }

	gripId = gripId !== undefined ? gripId : 0;

	var grip = this.grips[gripId];
	var snap = this.snaps[snapId];

	grip.addClassNames('transition');

	grip.x = snap.x;
	grip.setStyle('webkitTransform', 'translate3d(' + grip.x + 'px, 0, 0)');

	this.grips[gripId].snapId = snapId;

	if (this.isRange) { this._updateRangeDisplay(); }

	if (!isSilent) { this.emit('setGrip', snapId, gripId); }

	if (grip === this.activeGrip) {
		delete this.activeGrip;
	}
};

SnapSlider.prototype.labelSnap = function (snapId, label) {
	var snap = this.snaps[snapId];
	if (snapId < 0 || snapId > this.numSnaps - 1 || !snap) {
		return;
	}

	if (!snap.label) {
		snap.label = snap.createChild('div', { className: 'label' });
	}
	snap.label.setText(label);
};

SnapSlider.prototype.getClosestSnap = function (grip) {
	// return snap closest to active grip
	if (!grip) {
		return;
	}

	var snapGapWidth = this._railBox.width / (this.numSnaps - 1);
	var closestSnapId =  Math.floor((grip.x - snapGapWidth / 2) / snapGapWidth) + 1;
	return this.snaps[closestSnapId];
};

SnapSlider.prototype._updateRangeDisplay = function () {
	// NB: when in full range, we don't highlight the range - clearer for human eye
	var isFullRange = this.grips[0].snapId === 0 && this.grips[1].snapId === this.numSnaps - 1;

	for (var j = 0; j < this.numSnaps; j += 1) {
		var isInRange = !isFullRange && (j >= this.grips[0].snapId && j <= this.grips[1].snapId);
		this.snaps[j].toggleClassName('inRange', isInRange);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/SnapSlider/index.js
 ** module id = 676
 ** module chunks = 0
 **/