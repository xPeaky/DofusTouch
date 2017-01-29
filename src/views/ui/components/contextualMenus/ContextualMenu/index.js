require('./styles.less');
var Button = require('Button');
var dimensions = require('dimensionsHelper').dimensions;
var getText = require('getText').getText;
var helper = require('positionHelper');
var keyboard = require('keyboard');
var inherits = require('util').inherits;
var Scroller = require('Scroller');
var tapPosition = require('tapHelper').position;
var tweener = require('tweener');
var WuiDom = require('wuidom');

var MARGIN_FROM_SCREEN = 10;
var HEADER_HEIGHT = 40;


function ContextualMenu(options) {
	WuiDom.call(this, 'div', { className: 'ContextualMenu', hidden: true });

	options = options || {};

	this.addClassNames(options.className);

	this._position = {};

	this.header = this.createChild('div', { className: 'contextHeader' });
	if (options.noHeader) {
		this._displayHeader(false);
	}

	this.entryContainer = this.createChild('div', { className: 'entryContainer' });
	this.scroller = this.entryContainer.appendChild(new Scroller({ className: 'entryList' }, { showHintArrows: true }));
	this.entryList = this.scroller.content;

	// Compute max scrolling height. Note the header is not included in scrolling content
	this.maxHeight = dimensions.screenHeight - 2 * MARGIN_FROM_SCREEN - (options.noHeader ? 0 : HEADER_HEIGHT);
	this.requestedHeight = this.maxHeight;
	this.currentHeight = 0;

	// Handle keyboard opening & closing - we have more or less space suddenly...
	var self = this;
	keyboard.on('show', function (keyboardHeight) {
		self._refreshScroller(self.maxHeight - keyboardHeight);
	});
	keyboard.on('hide', function () {
		self._refreshScroller(self.maxHeight);
	});
}
inherits(ContextualMenu, WuiDom);
module.exports = ContextualMenu;


/**
 * Updates the requested size of context menu and refreshes the display if open
 * @param {number} [newHeight] - new available size for menu.
 *                               If undefined, we want to refresh the scroller with latest requested size
 */
ContextualMenu.prototype._refreshScroller = function (newHeight) {
	if (newHeight !== undefined) {
		// Available height is changing (keyboard open/close)
		this.requestedHeight = newHeight;
		// We only care if menu is open AND the size is different from current size
		if (!this.isOpen && !this.isOpening) { return; }
		if (this.requestedHeight === this.currentHeight) { return; }
		// Keyboard shown/hidden while context menu is open => we refresh the display
	}

	this.currentHeight = this.requestedHeight;
	this.scroller.setStyle('maxHeight', this.currentHeight + 'px');

	if (newHeight === undefined) {
		// Menu is opening; reset scroller position too (the transitions would mess this up otherwise)
		this.scroller.goToTop();
	}
	this.scroller.refresh();
};

ContextualMenu.prototype._displayHeader = function (display) {
	this.toggleClassName('noHeader', !display);
	this.header.toggleDisplay(display);
};

ContextualMenu.prototype._setPosition = function (x, y) {
	this._position.x = tapPosition.x;
	this._position.y = tapPosition.y;
	this.setStyles({ left: x + 'px', top: (y + 25) + 'px' });
};

ContextualMenu.prototype._addEntry = function (label, action) {
	var self = this;

	var entry = this.entryList.appendChild(new Button({ text: label, className: 'cmButton' }, action));
	entry.on('tap', function () {
		self.close();
	});

	return entry;
};

ContextualMenu.prototype._addCancel = function () {
	this._addSeparator();
	return this._addEntry(getText('ui.common.cancel'), function () {});
};

ContextualMenu.prototype._addSeparator = function () {
	this.entryList.createChild('div', { className: 'separator' });
};

ContextualMenu.prototype._openingAnimation = function (positioningMethod, params) {
	if (this.isOpening) { return; }
	if (this.isOpen) {
		this.close();
		this.next = { positioningMethod: positioningMethod, params: params };
		return;
	}
	this.isOpening = true;

	if (this._tween1) { this._tween1.cancel(); }
	if (this._tween2) { this._tween2.cancel(); }

	this.show();
	this.entryContainer.setStyle('overflow', 'visible');
	this.entryList.setStyle('webkitTransform', 'translate3d(0,-100%,0)');

	function openingAnimation() {
		self._tween1 = tweener.tween(
			self,
			{ webkitTransform: 'translate3d(0,-25px,0)', opacity: 1 },
			{ time: 100, easing: 'ease-out' },
			function () {
				self._tween1 = null;
			}
		);

		self._tween2 = tweener.tween(
			self.entryList,
			{ webkitTransform: 'translate3d(0,0,0)' },
			{ time: 200, easing: 'cubic-bezier(0,1,0.62,1)' },
			function () {
				this.setStyle('webkitTransform', ''); // NB: on Android the transition would interfere with scroller's transition
				self._tween2 = null;
				self.isOpening = false;
				self._tween = null;
				self.isOpen = true;

				if (self.closeRequest) {
					self.closeRequest = null;
					self.close('reopen');
				}
			}
		);
	}

	var self = this;
	this.emit('open', params, function () {
		self._refreshScroller();
		var position = positioningMethod();
		self._setPosition(position.x, position.y);
		self.entryContainer.setStyle('overflow', 'hidden');
		window.setTimeout(openingAnimation, 0);
	});
};

ContextualMenu.prototype.openAt = function (x, y, params) {
	var self = this;

	this._openingAnimation(function () {
		return helper.getElementPositionAt(self, x, y);
	}, params);
};

ContextualMenu.prototype.openAround = function (wuiDom, params) {
	var self = this;

	this._openingAnimation(function () {
		return helper.getElementPositionAround(self, wuiDom);
	}, params);
};

ContextualMenu.prototype.close = function (params) {
	if (this.isOpening) {
		this.closeRequest = true;
		return;
	}
	if (this.isClosing || !this.isOpen) { return; }
	this.isClosing = true;
	if (this._tween1) { this._tween1.cancel(); }
	if (this._tween2) { this._tween2.cancel(); }

	var self = this;
	this.emit('close', params);

	this._tween1 = tweener.tween(
		this.entryList,
		{ webkitTransform: 'translate3d(0,-100%,0)' },
		{ time: 200, easing: 'ease-out' },
		function () {
			self._tween1 = null;
			self.isClosing = false;
			self.isOpen = false;

			if (self.next) {
				self._openingAnimation(self.next.positioningMethod, self.next.params);
				self.next = null;
			}
		}
	);

	this._tween2 = tweener.tween(
		this,
		{ webkitTransform: 'translate3d(0,0,0)', opacity: 0 },
		{ delay: 100, time: 100, easing: 'ease-out' },
		function () {
			self.hide();
			self._tween2 = null;
		}
	);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenu/index.js
 ** module id = 298
 ** module chunks = 0
 **/