require('./styles.less');
var positionHelper = require('positionHelper');
var getElementPositionAround = positionHelper.getElementPositionAround;
var getElementPositionAt = positionHelper.getElementPositionAt;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var tweener = require('tweener');
var tapBehavior = require('tapBehavior');
var hoverBehavior = require('hoverBehavior');
var interactionHandler = require('interactionHandler');
var playUiSound = require('audioManager').playUiSound;

function TooltipBox(options) {
	options = options || {};

	WuiDom.call(this, 'div', { className: 'TooltipBox', name: options.name });

	this.content = this.createChild('div', { className: 'content' });

	this.openState = true;

	if (!options.openTooltipBox) {
		this.close(true);
	}

	this.setContent(options.content);
}

inherits(TooltipBox, WuiDom);
var exports = module.exports = TooltipBox;


/** Remove old content (if any), and sets the given content instead
 *  @param {WuiDom} content - new content */
TooltipBox.prototype.setContent = function (content) {
	// NB: we don't want to this.content.clearContent() because we want to keep the 'content' alive for update
	// this.content.clearContent() will destroy 'content' that can be updated somewhere else
	// removeChild() keep the child alive
	var children = this.content.getChildren();
	for (var i = 0; i < children.length; i++) {
		this.content.removeChild(children[i]);
	}

	if (content) {
		this.content.appendChild(content);
	}
};

TooltipBox.prototype.position = function (button) {
	var position = getElementPositionAround(this, button);
	this.setStyle('webkitTransform', 'translate3d(' + position.x + 'px,' + position.y + 'px,0)');
};

TooltipBox.prototype.positionAt = function (x, y) {
	var position = getElementPositionAt(this, x, y);
	this.setStyle('webkitTransform', 'translate3d(' + position.x + 'px,' + position.y + 'px,0)');
};

function onOpen() {
	this.addClassNames('transition');
}

TooltipBox.prototype.open = function (button, position) {
	if (this.openState) {
		if (position) {
			this.positionAt(position.x, position.y);
		} else {
			this.position(button);
		}
		return;
	}
	this.openState = true;

	playUiSound('ROLLOVER');
	this.show();
	if (position) {
		this.positionAt(position.x, position.y);
	} else {
		this.position(button);
	}

	tweener.tween(this, { opacity: 1 }, { time: 150, easing: 'ease-out' }, onOpen);
};

function onClose() {
	this.delClassNames('transition');
	this.hide();
}

TooltipBox.prototype.close = function (noAnimation) {
	if (!this.openState) { return; }
	this.openState = false;

	if (noAnimation) {
		this.setStyle('opacity', 0);
		onClose.call(this);
		return;
	}

	tweener.tween(this, { opacity: 0 }, { time: 150, easing: 'ease-out' }, onClose);
};


var closingTimeout, tooltip, currentTarget, tooltipMode;

function closeWindowTooltip() {
	if (currentTarget) {
		currentTarget.emit('tooltipOut');
		currentTarget = null;
	}
	clearTimeout(closingTimeout);
	closingTimeout = null;
	tooltip.close();
}

function closeWindowTooltipWithDelay() {
	if (currentTarget) {
		currentTarget.emit('tooltipOut');
		currentTarget = null;
	}
	clearTimeout(closingTimeout);
	closingTimeout = setTimeout(closeWindowTooltip, 500);
}

exports.initialiseTooltipBehavior = function (wBody) {
	tooltip = new TooltipBox();
	wBody.on('dom.touchend', function () {
		if (tooltipMode) {
			hoverBehavior.stop();
		}
		tooltipMode = false;
		closeWindowTooltip();
	});
	return tooltip;
};


/**
 * Add a tooltip box to the desired WuiDom element. It will open on a long touch of the user.
 * @param {object} target - the WuiDom element on which you want to add the tooltip.
 * @param {string|WuiDom|function} content - the content to display in the tooltip. You can either give a
 *                                    string or WuiDom object or a method that returns either of them.
 * @param {object} [options] - tooltip options
 * @param {Boolean} [options.openOnTap]
 */
exports.addTooltip = function (target, content, options) {
	if (target.hasOwnProperty('_tooltipEnabled')) { return; }
	target._tooltipEnabled = true;

	options = options || {};
	content = typeof content === 'string' ? new WuiDom('div', { text: content }) : content;

	function getContent() {
		var newContent = content;

		if (typeof content === 'function') {
			newContent = content.call(target);
			newContent = typeof newContent === 'string' ?
				new WuiDom('div', { text: newContent }) : newContent;
		}

		return newContent;
	}

	function displayTooltip() {
		if (!target._tooltipEnabled || !interactionHandler.requestInteractionHandle(tooltip)) {
			return;
		}

		clearTimeout(closingTimeout);
		closingTimeout = null;

		if (currentTarget && currentTarget === target) { return; }

		var newContent = getContent();
		var hasValidContent = newContent instanceof WuiDom;

		if (currentTarget) {
			currentTarget.emit('tooltipOut');
		}

		if (!hasValidContent) {
			tooltip.close(true);
			tooltip.setContent(false);
			return;
		}

		tooltip.setContent(newContent);
		tooltip.open(target, options.position);
		currentTarget = target;
		target.emit('tooltipOn');
	}

	tapBehavior(target);
	hoverBehavior(target);
	target.on('longtap', function () {
		hoverBehavior.start();
		displayTooltip();
		tooltipMode = true;
	});
	target.on('touchenter', function () {
		if (tooltipMode) {
			displayTooltip();
		}
	});
	if (options.openOnTap) {
		target.on('tap', displayTooltip);
	}

	target.on('touchleave', closeWindowTooltipWithDelay);
};

/**
 * Enable or disable opening a tooltip box on the desired WuiDom element.
 * @param {object} target - the WuiDom element on which you want to enable/disable the tooltip.
 * @param {boolean} enable - true if you want to enable opening a tooltip box, false otherwise
 */
exports.enableTooltip = function (target, enable) {
	if (!target.hasOwnProperty('_tooltipEnabled') || target._tooltipEnabled === enable) {
		return;
	}
	target._tooltipEnabled = enable;
};

var MIN_NOTIF_TIMEOUT = 3000;


function computeDisplayTime(contentLength) {
	return Math.max(MIN_NOTIF_TIMEOUT, contentLength / 25 * 1000); // longer timeout for a longer text
}
exports.computeNotificationDisplayTime = computeDisplayTime;

/**
 * Display a notification for a brief time.
 * @param {string|WuiDom} content - what the notification will show
 * @param {WuiDom} target - element next to which we want to display the notification
 * @param {number} [timeout] - how many ms should the notification be displayed. Default is 2 sec minimum.
 */
exports.showNotification = function (content, target, timeout) {
	if (typeof content === 'string') {
		timeout = timeout || computeDisplayTime(content.length);
		content = tooltip.createChild('div', { text: content });
	} else {
		timeout = timeout || MIN_NOTIF_TIMEOUT; // for non-text content we cannot calculate a default timeout easily
	}

	tooltip.setContent(content);
	tooltip.open(target);
	closingTimeout = setTimeout(closeWindowTooltip, timeout);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/TooltipBox/index.js
 ** module id = 205
 ** module chunks = 0
 **/