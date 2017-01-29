require('./styles.less');
var Button = require('Button');
var inherits = require('util').inherits;
var slideBehavior = require('slideBehavior');
var tweener = require('tweener');
var WuiDom = require('wuidom');

function SwipingTabs(options) {
	WuiDom.call(this, 'div', { className: 'SwipingTabs' });

	options = options || {};

	if (options.className) { this.addClassNames(options.className); }
	this.tabClassName = options.tabClassName || 'swipeTabBtn';

	this.tabList = [];
	this.tabMap = {};
	this.index = null;

	this.currentTab = null;
	this.leftTab = null;
	this.rightTab = null;

	// "Issue" with cycling is we cannot allow cycle-swiping on left side (from 1st tab directly to last tab)
	// if we have only 2 tabs (animation is harder to code, I guess, so it is not done yet)
	this.isCyclingAllowed = !options.noCycling;

	if (!options.noHeader) {
		this.header = this.createChild('div', { className: 'swipeHeader' });
	}
	this.content = this.createChild('div', { className: 'swipeContent' });
	this.tabContainer = this.content.createChild('div', { className: 'tabContainer' });

	slideBehavior(this.content);
	this.setSwipeDirection(options.direction || 'horizontal');
	var self = this;

	var delta, init, contentSize;

	var tweenWasCancelled = false;
	this.tabContainer.on('tweenCancelled', function () {
		tweenWasCancelled = true;
	});

	this.content.on('slideStart', function (touch, box) {
		if (tweenWasCancelled) {
			tweenWasCancelled = true;
			self._positionTabs();
		}

		init = touch[self._axis];
		contentSize = self._axis === 'x' ? box.width : box.height;

		self.tabContainer.setStyle('webkitTransition', '');
		self.currentTab.content.emit('slideStart');
		self.emit('slideStart');
	});

	this.content.on('slideCancel', function () {
		self.currentTab.content.emit('slideEnd');
		self.emit('slideEnd');
		self.tabContainer.setStyles({
			webkitTransform: 'translate' + self._axis + '(0)',
			webkitTransition: '-webkit-transform 200ms ease-out'
		});
	});

	this.content.on('slide', function (touch) {
		if (this.slideOut) { return; }

		delta = init - touch[self._axis];

		if ((delta > 0 && !self._canRightSlide) || (delta < 0 && !self._canLeftSlide)) {
			delta = 0;
			init = touch[self._axis];
		}

		self.tabContainer.setStyle('webkitTransform', 'translate' + self._axis + '(' + -delta + 'px)');
	});

	this.content.on('slideEnd', function (touch, init, swipe) {
		self.currentTab.content.emit('slideEnd');
		self.emit('slideEnd');

		var slideDistance = Math.abs(delta);
		if (slideDistance > contentSize / 3 || swipe) {
			var index = self.index;
			if (delta > 0 && self._canRightSlide) {
				index = self.rightTab.index;
			}

			if (delta < 0 && self._canLeftSlide) {
				index = self.leftTab.index;
			}

			self._openTabWithTransition(index);
		} else {
			self.tabContainer.setStyles({
				webkitTransform: 'translate' + self._axis + '(0)',
				webkitTransition: '-webkit-transform 200ms ease-out'
			});
		}
	});
}
inherits(SwipingTabs, WuiDom);

SwipingTabs.prototype.setSwipeDirection = function (direction) {
	this._direction = direction;
	this.content.setSlideDirection(direction);
	this._axis = direction === 'vertical' ? 'y' : 'x';
	if (this.index !== null) {
		this._positionTabs();
	}
};

SwipingTabs.prototype.addTab = function (caption, content, id) {
	var self = this;

	var index = this.tabList.length;

	content.addClassNames('swipeTabContent');

	var tabData = this.tabMap[id] = {
		id: id,
		index: this.tabList.length,
		content: content,
		position: 0,
		enable: true
	};

	if (this.header) {
		tabData.tabBtn = this.header.appendChild(
			new Button({ className: this.tabClassName, text: caption }, function () {
				self.openTab(index);
			})
		);
		tabData.tabBtn.addClassNames('tab' + index);
	}

	this.tabList.push(tabData);

	this.tabContainer.appendChild(content);
	content.hide();

	return index;
};

SwipingTabs.prototype.getTabContent = function (index) {
	var tab = isNaN(index) ? this.tabMap[index] : this.tabList[index];
	return tab && tab.content;
};

SwipingTabs.prototype.swipeNegative = function () {
	if (this.leftTab) {
		this._openTabWithTransition(this.leftTab.index);
	}
};

SwipingTabs.prototype.swipePositive = function () {
	if (this.rightTab) {
		this._openTabWithTransition(this.rightTab.index);
	}
};

SwipingTabs.prototype._openTabWithTransition = function (index, params) {
	var tab = this.tabList[index];

	var previousTabData = this.tabList[this.index];
	if (this.header) {
		previousTabData.tabBtn.delClassNames('on');
	}
	previousTabData.content.emit('close');

	tab.content.emit('open', params);

	var self = this;
	tweener.tween(
		this.tabContainer,
		{ webkitTransform: 'translate' + this._axis + '(' + -tab.position + '%)' },
		{ time: 200, easing: 'ease-out' },
		function () {
			self._positionTabs();
			tab.content.emit('opened', params);
			self.emit('openTab', tab.id);
		}
	);

	this.index = tab.index;
	if (this.header) {
		tab.tabBtn.addClassNames('on');
	}
};

/**
 * Call this when you need to reset the display after:
 * - adding a new tab while SwipingTabs is already open (openTab already called)
 * - externally modifying the visible (show/hide) state of the tab's content
 */
SwipingTabs.prototype.reopen = function () {
	var tab = this.tabList[0];
	this.index = tab.index;
	this.leftTab = null;
	this.rightTab = null;

	var rightTab = this._getNextAvailableRightTab();
	var leftTab = this._getNextAvailableLeftTab();

	for (var i = 0; i < this.tabList.length; i++) {
		var aTab = this.tabList[i];
		var shouldShow = aTab === tab || aTab === leftTab || aTab === rightTab;
		aTab.content.toggleDisplay(shouldShow);
	}
	this._positionTabs();
};

SwipingTabs.prototype.openTab = function (index, params, options) {
	options = options || {};
	var tab = isNaN(index) ? this.tabMap[index] : this.tabList[index];
	if (!tab) { return; }

	if (!options.forceOpen && this.index === tab.index) { return; }

	if (this.index !== null) {
		if (tab === this.leftTab || tab === this.rightTab) { return this._openTabWithTransition(tab.index, params); }
		var previousTabData = this.tabList[this.index];
		if (this.header) {
			previousTabData.tabBtn.delClassNames('on');
		}
		previousTabData.content.emit('close');
		previousTabData.content.hide();
	}

	tab.content.emit('open', params);

	this.index = tab.index;
	if (this.header) {
		tab.tabBtn.addClassNames('on');
	}
	tab.content.show();
	this._positionTabs();

	tab.content.emit('opened', params);
	this.emit('openTab', tab.id);
};

SwipingTabs.prototype.close = function () {
	this.tabList[this.index].content.emit('close');
};

SwipingTabs.prototype._getNextAvailableRightTab = function () {
	var i, len, tab;

	for (i = this.index + 1, len = this.tabList.length; i < len; i += 1) {
		tab = this.tabList[i];
		if (tab.enable) {
			return tab;
		}
	}
	if (!this.isCyclingAllowed) { return null; }

	for (i = 0, len = this.index; i < len; i += 1) {
		tab = this.tabList[i];
		if (tab.enable) {
			return tab;
		}
	}

	return null;
};

SwipingTabs.prototype._getNextAvailableLeftTab = function () {
	var i, tab;

	for (i = this.index - 1; i >= 0; i -= 1) {
		tab = this.tabList[i];
		if (tab.enable) {
			return tab;
		}
	}
	if (!this.isCyclingAllowed) { return null; }

	for (i = this.tabList.length - 1; i > this.index; i -= 1) {
		tab = this.tabList[i];
		if (tab.enable) {
			return tab;
		}
	}

	return null;
};

SwipingTabs.prototype._positionTabs = function () {
	var currentTab = this.currentTab = this.tabList[this.index];
	currentTab.content.setStyle('webkitTransform', 'translate' + this._axis + '(0)');
	currentTab.position = 0;
	this.tabContainer.setStyles({
		webkitTransform: 'translate' + this._axis + '(0)',
		webkitTransition: ''
	});

	// Hide the tab that just "disappeared" while we swiped
	// I.e. previous left or right tab became current, the other side's tab can be hidden cause it is 2 tabs away
	if (this.leftTab && this.leftTab !== currentTab) { this.leftTab.content.hide(); }
	if (this.rightTab && this.rightTab !== currentTab) { this.rightTab.content.hide(); }

	// Reset our left and right - we will get this info again below...
	this.leftTab = this.rightTab = null;

	var rightTab = this._getNextAvailableRightTab();
	var leftTab = this._getNextAvailableLeftTab();

	if (rightTab && rightTab === leftTab) {
		// We have exactly 2 tabs so right == left; we don't autorize cycling so only left or right is possible
		if (this.index < leftTab.index) {
			this._canRightSlide = true;
			this._canLeftSlide = false;
			this.rightTab = rightTab;
			rightTab.position = 100;
			rightTab.content.show();
			rightTab.content.setStyle('webkitTransform', 'translate' + this._axis + '(100%)');
		} else {
			this._canRightSlide = false;
			this._canLeftSlide = true;
			this.leftTab = leftTab;
			leftTab.position = -100;
			leftTab.content.show();
			leftTab.content.setStyle('webkitTransform', 'translate' + this._axis + '(-100%)');
		}
	} else {
		if (!rightTab) {
			this._canRightSlide = false;
		} else {
			this._canRightSlide = true;
			this.rightTab = rightTab;
			rightTab.position = 100;
			rightTab.content.show();
			rightTab.content.setStyle('webkitTransform', 'translate' + this._axis + '(100%)');
		}

		if (!leftTab) {
			this._canLeftSlide = false;
		} else {
			this._canLeftSlide = true;
			this.leftTab = leftTab;
			leftTab.position = -100;
			leftTab.content.show();
			leftTab.content.setStyle('webkitTransform', 'translate' + this._axis + '(-100%)');
		}
	}
};

/**
 * Sets a tab's availability (enables/disables the tab's button and if we can swipe to the tab or if it is skipped).
 * If tab is already in this state, nothing happens.
 * @param {string|number} index - the tab index or ID
 * @param {boolean} enable - which state we want for the tab; undefined is equivalent to false
 */
SwipingTabs.prototype.toggleTabAvailability = function (index, enable) {
	var tab = isNaN(index) ? this.tabMap[index] : this.tabList[index];
	if (!tab) { return; }

	if (arguments.length < 2) {
		console.error(new Error('toggleTabAvailability missing param'));
		enable = !tab.enable; // TODO: remove this after a while - if the error above does not show in logs
	}

	enable = !!enable;
	if (enable === tab.enable) { return; } // tab already in this state
	tab.enable = enable;

	if (this.header) {
		if (enable) {
			tab.tabBtn.enable();
		} else {
			tab.tabBtn.disable();
		}
	}

	// If we have already been opened, update display now
	if (this.index !== null) { this._positionTabs(); }
};

SwipingTabs.prototype.toggleTabNotification = function (index, toggle) {
	var tab = isNaN(index) ? this.tabMap[index] : this.tabList[index];
	if (!tab || !this.header) { return; }

	tab.tabBtn.toggleClassName('notification', toggle);
};

module.exports = SwipingTabs;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/SwipingTabs/index.js
 ** module id = 507
 ** module chunks = 0
 **/