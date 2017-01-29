require('./styles.less');
var interactionHandler = require('interactionHandler');
var IScroll = require('iScroll');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');

var SCROLL_THRESHOLD = 10;
var HINT_BORDER_TOLERANCE = 17; // in px, hint arrows will show only if we can scroll more than "tolerance"
var NOTIFY_FREQUENCY = 200; // "blinking frenquency" for player notify hint
var NOTIFY_NUM_CYCLES = 8;


/**
 * @param {object} [wuiDomOptions] - usual options for WuiDom
 * @param {object} [options] - options for Scroller itself
 * @param {boolean} [options.isHorizontal] - default is vertical
 * @param {boolean} [options.showHintArrows] - show hints that there is more to see
 */
function Scroller(wuiDomOptions, options) {
	WuiDom.call(this, 'div', wuiDomOptions);
	this.addClassNames('Scroller');

	options = options || {};
	var isHorizontal = !!options.isHorizontal;
	var cssClassNames = isHorizontal ? ['scrollerContent', 'horizontal'] : 'scrollerContent';

	this.content = this.createChild('div', { className: cssClassNames });
	this.iScroll = new IScroll(this.rootElement, {
		scrollbars: 'custom',
		fadeScrollbars: false,
		bounce: options.bounce,
		maxSpeed: options.maxSpeed,
		scrollX: isHorizontal,
		scrollY: !isHorizontal,
		mouseWheel: true,
		preventDefault: false,
		directionLockThreshold: SCROLL_THRESHOLD
	});
	this.iScroll.myScroller = this;
	this.on('destroy', this._destroyHandler);

	if (options.showHintArrows) {
		this.scrollUpHint = this.createChild('div', { className: 'scrollUpHint' });
		this.scrollDownHint = this.createChild('div', { className: 'scrollDownHint' });
		this.notifyInterval = null;
		this.notifyCount = 0;
	}

	this.isEnable = true;
	this._handleRegistered = false;

	var self = this;
	// ensure that the whole dom structure is loaded before iScroll computes the available size. We will find a more
	// suitable solution in the future.
	window.setTimeout(function () {
		self.refresh();
	}, 200);

	this._setupEventListeners();
}
inherits(Scroller, WuiDom);

Scroller.ease = IScroll.utils.ease;


Scroller.prototype._destroyHandler = function () {
	window.clearInterval(this.notifyInterval);
	this.iScroll.destroy();
};

function scrollStartHandler() {
	// "this" is iScroll
	var self = this.myScroller;
	if (!interactionHandler.requestInteractionHandle(self)) {
		return self.cancel();
	}
	// Hide hints while we scroll
	if (self.scrollUpHint) {
		self.scrollUpHint.hide();
		self.scrollDownHint.hide();
	}
	self.emit('scrollStart');
}

function scrollEndHandler() {
	// "this" is iScroll
	var self = this.myScroller;
	self._refreshHints();
	self.emit('scrollEnd');
}

function scrollCancelHandler() {
	this.myScroller.emit('scrollCancel');
}

function onHandleTaken(element) {
	if (element !== this) { this.cancel(); }
}

function touchStartHandler() {
	if (this.requestRefresh) {
		this.refresh(true);
	}

	if (this._handleRegistered) { return; }
	this._handleRegistered = true;
	interactionHandler.once('handleTaken', onHandleTaken.bind(this));
}

function touchEndHandler() {
	interactionHandler.removeListener('handleTaken', onHandleTaken.bind(this));
	if (this.isEnable) {
		this.iScroll.enable();
	}
	this._handleRegistered = false;
}

Scroller.prototype._setupEventListeners = function () {
	this.allowDomEvents();
	this.on('dom.touchstart', touchStartHandler);
	this.on('dom.touchend', touchEndHandler);

	// iScroll also emits other events
	this.iScroll.on('scrollStart', scrollStartHandler);
	this.iScroll.on('scrollEnd', scrollEndHandler);
	this.iScroll.on('scrollCancel', scrollCancelHandler);
};

Scroller.prototype._refreshHints = function () {
	if (!this.scrollUpHint) { return; }
	this.scrollUpHint.toggleDisplay(this.canScrollUp(HINT_BORDER_TOLERANCE));
	this.scrollDownHint.toggleDisplay(this.canScrollDown(HINT_BORDER_TOLERANCE));
};

Scroller.prototype.cancel = function () {
	this.iScroll.disable();
};

Scroller.prototype.refresh = function (force) {
	if (!force && this.rootElement.clientHeight === 0) {
		this.requestRefresh = true;
		return;
	}
	this.iScroll.refresh();
	this.toggleClassName('scrollBgVisible', this.iScroll.hasVerticalScroll || this.iScroll.hasHorizontalScroll);
	this._refreshHints();
	this.requestRefresh = false;
};

/** Alert player so he knows he can scroll */
Scroller.prototype.notify = function () {
	if (!this.scrollUpHint) { return; } // cannot notify without the arrow hints (=> use option showHintArrows)
	if (!this.canScrollDown()) { return; }

	this.notifyCount = NOTIFY_NUM_CYCLES;
	if (this.notifyInterval) { return; } // already showing so we just do it some more

	var self = this;
	this.notifyInterval = window.setInterval(function () {
		// "blink" once
		self.scrollDownHint.toggleDisplay();
		self.notifyCount--;
		if (self.notifyCount > 0) { return; }

		// We are done blinking now
		window.clearInterval(self.notifyInterval);
		self.notifyInterval = null;
		self._refreshHints(); // just in case player scrolled while we were blinking, or content changed
	}, NOTIFY_FREQUENCY);
};

/** Scrolls so that the element (wuiDom) appears on top of scroller's visible part */
Scroller.prototype.scrollToElement = function (wuiDom, time, offsetX, offsetY, easing) {
	this.iScroll.scrollToElement(wuiDom.rootElement, time, offsetX, offsetY, easing);
	// If there is no animation we will not receive "scrollEnd" so we refresh now
	if (!time) { this._refreshHints(); }
};

/**
 * Scrolls so that the element (wuiDom), or the biggest possible part of it, is showed,
 * in the most natural way to a human eye.
 * E.g. if element is already showed fully, no scroll will happen.
 * Or if element is already partially showed, only the minimum necessary scroll will be done.
 */
Scroller.prototype.showElement = function (wuiDom, time, easing) {
	var iScroll = this.iScroll;
	var el = wuiDom.rootElement;
	// Code below should go into iScroll when we can make PRs to it again...
	el = el.nodeType ? el : iScroll.scroller.querySelector(el);

	var pos = IScroll.utils.offset(el);

	pos.left -= iScroll.wrapperOffset.left;
	pos.top  -= iScroll.wrapperOffset.top;
	var elHeight = el.offsetHeight;
	var elWidth = el.offsetWidth;

	// If the element is "somewhere below" the top of scroller's visible part
	// ...and if the element is small enough to be displayed fully
	if (pos.top < iScroll.y && elHeight <= iScroll.wrapperHeight) {
		// Recompute position from bottom of scroller so that element appears fully
		pos.top = Math.min(pos.top - elHeight + iScroll.wrapperHeight, iScroll.y);
	}
	// Same algo for horizontal scrolling
	if (pos.left < iScroll.x && elWidth <= iScroll.wrapperWidth) {
		pos.left = Math.min(pos.left - elWidth + iScroll.wrapperWidth, iScroll.x);
	}

	pos.left = Math.min(0, Math.max(iScroll.maxScrollX, pos.left));
	pos.top  = Math.min(0, Math.max(iScroll.maxScrollY, pos.top));

	if (pos.left === iScroll.x && pos.top === iScroll.y) {
		return; // no scrolling necessary
	}

	time = time === undefined || time === null || time === 'auto' ?
		Math.max(Math.abs(iScroll.x - pos.left), Math.abs(iScroll.y - pos.top)) : time;

	this.scrollTo(pos.left, pos.top, time, easing);
};

Scroller.prototype.scrollTo = function (x, y, time, easing) {
	this.iScroll.scrollTo(x, y, time, easing);
	// If there is no animation we will not receive "scrollEnd" so we refresh now
	if (!time) { this._refreshHints(); }
};

Scroller.prototype.scrollBy = function (x, y, time, easing) {
	this.iScroll.scrollBy(x, y, time, easing);
	// If there is no animation we will not receive "scrollEnd" so we refresh now
	if (!time) { this._refreshHints(); }
};

Scroller.prototype.setEnable = function (enable) {
	if (enable) {
		this.iScroll.enable();
	} else {
		this.iScroll.disable();
	}
	this.isEnable = enable;
};

Scroller.prototype.canScrollUp = function (px) {
	px = px || 1;
	if (this.iScroll.options.scrollY) {
		return this.iScroll.y <= -px;
	}
	return this.iScroll.x <= -px;
};

Scroller.prototype.canScrollDown = function (px) {
	px = px || 1;
	if (this.iScroll.options.scrollY) {
		return this.iScroll.maxScrollY - this.iScroll.y <= -px;
	}
	return this.iScroll.maxScrollX - this.iScroll.x <= -px;
};

Scroller.prototype.goToTop = function (time, easing) {
	if (this.iScroll.options.scrollY) {
		return this.scrollTo(this.iScroll.x, 0, time, easing);
	}
	this.scrollTo(0, this.iScroll.y, time, easing);
};

Scroller.prototype.goToBottom = function (time, easing) {
	if (this.iScroll.options.scrollY) {
		return this.scrollTo(this.iScroll.x, this.iScroll.maxScrollY, time, easing);
	}
	this.scrollTo(this.iScroll.maxScrollX, this.iScroll.y, time, easing);
};

module.exports = Scroller;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/Scroller/index.js
 ** module id = 301
 ** module chunks = 0
 **/