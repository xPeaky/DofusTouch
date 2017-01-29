require('./styles.less');
var inherits = require('util').inherits;
var slideBehavior = require('slideBehavior');
var tweener = require('tweener');
var WuiDom = require('wuidom');

var speed = 1;

/**
 * SwipingDrawer constructor
 * @param {object} [options]
 * @param {...string|...string[]} [options.className]
 * @param {boolean} [options.background]
 * @param {boolean} [options.autoClose]
 * @param {string} [options.openingSide] - Can be 'top', 'bottom', 'left', 'right'
 * @param {number} [options.backDrawerSize] - pixel size of "something" that does not scroll in the back (e.g. gauge)
 * @constructor
 */
function SwipingDrawer(options) {
	WuiDom.call(this, 'div', { className: 'SwipingDrawer' });

	options = options || {};

	this.addClassNames(options.className);

	if (options.background) {
		this.backgroundArea = this.createChild('div', { className: 'drawerBackgroundArea' });
		this.background = this.backgroundArea.createChild('div', { className: 'drawerBackground' });
	}
	this.visibleArea = this.createChild('div', { className: 'visibleArea' });
	this.content = this.visibleArea.createChild('div', { className: 'drawerContent' });

	this._contentSize = 0;
	this._extraContentSize = options.backDrawerSize || 0;
	this.isOpen = false;
	this._isAlwaysOpen = false;

	function slideWhenOpen(touch) {
		var touchPos = touch[this._axis] - startPos;
		if (touchPos * this._direction <= 0) {
			touchPos = 0;
		} else if (touchPos * this._direction > this._contentSize - this._visibleSize) {
			touchPos = (this._contentSize - this._visibleSize) * this._direction;
		}

		var translate = 'translate' + this._axis + '(' + (this._currentPosition + touchPos) + 'px)';
		this.content.setStyle('webkitTransform', translate);

		if (this.background) {
			this.background.setStyle('webkitTransform', translate);
		}
	}

	function slideWhenClose(touch) {
		var touchPos = touch[this._axis] - startPos;
		if (touchPos * this._direction >= 0) {
			touchPos = 0;
		} else if (touchPos * this._direction < this._visibleSize - this._contentSize) {
			touchPos = (this._visibleSize - this._contentSize) * this._direction;
		}

		var translate = 'translate' + this._axis + '(' + (this._currentPosition + touchPos) + 'px)';
		this.content.setStyle('webkitTransform', translate);

		if (this.background) {
			this.background.setStyle('webkitTransform', translate);
		}
	}

	slideBehavior(this);
	var bound, startPos;
	this.on('slideStart', function (touch) {
		this.addClassNames('open');

		if (this._tween1) {
			this._tween1.cancel();
			this._tween1 = null;
		}
		if (this._tween2) {
			this._tween2.cancel();
			this._tween2 = null;
		}

		startPos = touch[this._axis];

		if (this.isOpen) {
			bound = (this._contentSize - this._visibleSize) / 3;
			this.on('slide', slideWhenOpen);
		} else {
			bound = (this._visibleSize - this._contentSize) / 3;
			this.on('slide', slideWhenClose);
		}
	});

	this.on('slideEnd', function (touch, init, swipe) {
		var touchPos = touch[this._axis] - startPos;
		this._currentPosition += touchPos;

		if (this.isOpen) {
			if (touchPos * this._direction  > bound || (swipe && touchPos * this._direction > 0)) {
				this._close(true);
			} else {
				this._open(true);
			}
			this.removeListener('slide', slideWhenOpen);
		} else {
			if (touchPos * this._direction  < bound || (swipe && touchPos * this._direction > 0)) {
				this._open(true);
			} else {
				this._close(true);
			}
			this.removeListener('slide', slideWhenClose);
		}
	});

	var wasTouched = false;
	var self = this;
	function registerTouch() {
		wasTouched = true;
	}

	/**
	 * auto close if it was opened
	 */
	function autoclose() {
		if (!wasTouched) {
			self.close();
		}
		wasTouched = false;
	}

	if (options.autoClose) {
		this.on('open', function () {
			this.on('dom.touchstart', registerTouch);
			window.gui.wBody.on('dom.touchstart', autoclose);
		});

		this.on('close', function () {
			this.removeListener('dom.touchstart', registerTouch);
			window.gui.wBody.removeListener('dom.touchstart', autoclose);
		});
	}

	if (options.openingSide) {
		this.setOpeningSide(options.openingSide);
	}
}
inherits(SwipingDrawer, WuiDom);
module.exports = SwipingDrawer;


SwipingDrawer.prototype.getCurrentDrawerSize = function () {
	return parseInt(this.getStyle(this._dimension), 10);
};

SwipingDrawer.prototype.getCurrentContentSize = function () {
	return this.content.rootElement[this._clientProperty];
};

SwipingDrawer.prototype.setAsAlwaysOpen = function (isAlwaysOpen) {
	this._isAlwaysOpen = isAlwaysOpen;
	this.lockDrawer(isAlwaysOpen);
};

SwipingDrawer.prototype.lockDrawer = function (lock) {
	if (lock === this.drawerLocked) { return; }
	this.close();
	this.drawerLocked = lock;
	this.lockSlide(lock);
};

/**
 * Set on which direction the drawer should open
 * @param {string} side - Can be 'top', 'bottom', 'left', 'right'
 */
SwipingDrawer.prototype.setOpeningSide = function (side) {
	this.side = side;
	this.replaceClassNames(['top', 'bottom', 'left', 'right'], [side]);
	switch (side) {
	case 'top':
		this._axis = 'y';
		this._dimension = 'height';
		this._clientProperty = 'clientHeight';
		this._direction = 1;
		this.setSlideDirection('vertical');
		break;
	case 'bottom':
		this._axis = 'y';
		this._dimension = 'height';
		this._clientProperty = 'clientHeight';
		this._direction = -1;
		this.setSlideDirection('vertical');
		break;
	case 'left':
		this._axis = 'x';
		this._dimension = 'width';
		this._clientProperty = 'clientWidth';
		this._direction = 1;
		this.setSlideDirection('horizontal');
		break;
	case 'right':
		this._axis = 'x';
		this._dimension = 'width';
		this._clientProperty = 'clientWidth';
		this._direction = -1;
		this.setSlideDirection('horizontal');
		break;
	}
};

SwipingDrawer.prototype.refresh = function () {
	// TODO: if we ever want to get drawers to "switch" (e.g. from left side to right) there is an issue here.
	// this._visibleSize is set to the full size of the "open" drawer even if drawer is closed.
	// Possible solution would be to avoid recomputing this._visibleSize if this is a side-switch.
	this._visibleSize = this.rootElement[this._clientProperty]; // visible part of the drawer when closed

	this._contentSize = this.getCurrentContentSize();
	if (!this._contentSize) { return; }
	if (this._isAlwaysOpen) {
		this._contentSize += this._extraContentSize;
	}

	var top, bottom, left, right, width, height;
	top = bottom = left = right = width = height = '';
	switch (this.side) {
	case 'top':
		bottom = this._visibleSize + 'px';
		break;
	case 'bottom':
		top = this._visibleSize + 'px';
		break;
	case 'left':
		right = this._visibleSize + 'px';
		break;
	case 'right':
		left = this._visibleSize + 'px';
		break;
	}

	// assign and reset previous values
	this.content.setStyles({
		top: top,
		bottom: bottom,
		left: left,
		right: right,
		width: width,
		height: height,
		webkitTransform: 'translate' + this._axis + '(' + 100 * this._direction + '%)'
	});
	this.setStyle(this._dimension, this._contentSize + 'px');

	if (this.background) {
		var backgroundStyle = {
			top: top,
			bottom: bottom,
			left: left,
			right: right,
			width: '',
			height: '',
			webkitTransform: 'translate' + this._axis + '(' + 100 * this._direction + '%)'
		};
		backgroundStyle[this._dimension] = this._contentSize + 'px';
		this.background.setStyles(backgroundStyle);
	}

	this._currentPosition = this._contentSize * this._direction;
	this.isOpen = false;
	this.delClassNames('open');
};

SwipingDrawer.prototype._open = function (force) {
	if (!force && (this._opening || this.isOpen || this.drawerLocked)) { return; }
	this._opening = true;
	this.addClassNames('open');

	if (this._tween1) { this._tween1.cancel(); }
	if (this._tween2) { this._tween2.cancel(); }

	if (!force) {
		this.emit('opening');
	}

	var time = Math.floor(Math.abs(this._visibleSize * this._direction - this._currentPosition) / speed);

	var self = this;
	this._tween1 = tweener.tween(
		this.content,
		{ webkitTransform: 'translate' + this._axis + '(' + this._visibleSize * this._direction + 'px)' },
		{ time: time, easing: 'ease-out' },
		function () {
			self._currentPosition = self._visibleSize * self._direction;
			self._tween1 = null;
			self._opening = false;
			if (!self.isOpen) { self.emit('open'); }
			self.isOpen = true;
		}
	);

	if (!this.background) { return; }
	this._tween2 = tweener.tween(
		this.background,
		{ webkitTransform: 'translate' + this._axis + '(' + this._visibleSize * this._direction + 'px)' },
		{ time: time, easing: 'ease-out' }, function () {
			self._tween2 = null;
		}
	);
};

SwipingDrawer.prototype.open = function () {
	this._open(false);
};

/**
 * @param {boolean} [force]
 * @private
 */
SwipingDrawer.prototype._close = function (force) {
	if (!force && (this._closing || !this.isOpen || this.drawerLocked)) { return; }
	this._closing = true;

	if (this._tween1) { this._tween1.cancel(); }
	if (this._tween2) { this._tween2.cancel(); }

	var time = Math.floor(Math.abs(this._contentSize * this._direction - this._currentPosition) / speed);

	if (!force) {
		this.emit('closing');
	}

	var self = this;
	this._tween1 = tweener.tween(
		this.content,
		{ webkitTransform: 'translate' + this._axis + '(' + 100 * this._direction + '%)' },
		{ time: time, easing: 'ease-out' },
		function () {
			self._currentPosition = self._contentSize * self._direction;
			self._tween1 = null;
			self._closing = false;
			self.emit('close');
			self.isOpen = false;
			self.delClassNames('open');
		}
	);

	if (!this.background) { return; }
	this._tween2 = tweener.tween(
		this.background,
		{ webkitTransform: 'translate' + this._axis + '(' + 100 * this._direction + '%)' },
		{ time: time, easing: 'ease-out' }, function () {
			self._tween2 = null;
		}
	);
};

SwipingDrawer.prototype.close = function () {
	this._close(/*force = */false);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/SwipingDrawer/index.js
 ** module id = 492
 ** module chunks = 0
 **/