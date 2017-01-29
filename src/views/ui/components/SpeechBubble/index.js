require('./styles.less');
var helper = require('helper');
var hyperlink = require('hyperlink');
var inherits = require('util').inherits;
var tapBehavior = require('tapBehavior');
var tooltip = require('TooltipBox');
var tweener = require('tweener');
var WuiDom = require('wuidom');


// To have the bubble look best (i.e. like a rectangle around the text, with just enough space)
// we have 3 types of width for bubble's text:
// - auto: when text is very short (width <= MID_TEXT_WIDTH) we don't set a width
// - MID_TEXT_WIDTH: when content's length is <  CONTENT_LENGTH_FOR_MAX_WIDTH
// - MAX_TEXT_WIDTH: when content's length is >= CONTENT_LENGTH_FOR_MAX_WIDTH
var MAX_TEXT_WIDTH = 250, MID_TEXT_WIDTH = 150; // in px, width of text content inside bubble
var CONTENT_LENGTH_FOR_MAX_WIDTH = 150; // number of characters from which we use MAX_TEXT_WIDTH

var FADE_IN_DELAY = 150;  // ms; appearing bubble
var NON_FROZEN_OPACITY = 0.85; // max opacity of a temporary bubble (= non-frozen)

var FADING_PERIOD = 2000; // ms; "fading" effect when bubble is about to disappear; player can tap on it to freeze it
var DIMMED_OPACITY = 0.6; // when bubble is about to disappear, it takes this opacity

var FADE_OUT_DELAY = 150; // ms; disappearing bubble

// Contants for multi-page messages

var MAX_TEXT_PAGE = 450;
var TOO_SHORT_PAGE = 0.30; // percentage
var LONG_ENOUGH_PAGE = 0.60; // percentage
var BOTTOM_RIGHT_SPACING = '\xA0\xA0\xA0'; // nbsp characters to move away from bottom right corner

// First class candidates for cutting inside a page (End Of Sentence)
var EOS = ['\n', '. ', '... ', '? ', '! ']; // the day we add unicode texts, complete this list
// Second class candidates (End of Word)
var EOW = [' ', ', ', ': ', '; '];
// Inserted at end of page and beginning of next page when we cut a sentence
var WILD_CUT_STR = '...';


/**
 * Creates a new bubble.
 * @param {object} params
 * @param {string|WuiDom} params.msg        - bubble's text or content
 * @param {string}        [params.title]    - title for the bubble's text
 * @param {boolean}       [params.isLocked] - bubble disappears using its own timer unless this is passed as true.
 *                                             To close "locked" bubbles, caller must call the close() method.
 * @param {object}        [params.actor]    - Actor from ActorManager, used to position the bubble
 * @param {function}      [params.action]   - called when player taps on the bubble (only for "locked" bubbles)
 * @param {function}      [params.onClose]  - called when bubble closes (no matter the reason)
 * @param {number}        [params.channel]  - style color of bubble according to the channel
 */
function SpeechBubble(params) {
	if (!params) {
		return console.error(new Error('SpeechBubble: params is missing'));
	}

	WuiDom.call(this, 'div', params);

	this.isAlive = true;
	this.tweener = null;
	this.timeout = null;
	this.isLocked = params.isLocked;
	this.msgPages = null;
	this.currentPage = 0;

	this._createContent(params);

	this.closeFunc = this.close.bind(this);

	this.actionHandler = params.action;
	this.closeHandler = params.onClose;

	if (params.title) { this.setTitle(params.title); }

	this._setContent(params.msg);

	this.actor = params.actor;
	if (params.actor && this.contentLength) {
		this._openNextToActor();
	}
}
inherits(SpeechBubble, WuiDom);
module.exports = SpeechBubble;


SpeechBubble.prototype._createContent = function (options) {
	this.addClassNames('speechBubble');
	if (this.isLocked) {
		this.addClassNames('frozen');
	}
	tapBehavior(this, { doubletapTimeout: 1 }); // 2 very quick taps still count as 2 taps
	this.on('tap', this._tapHandler);

	if (options.title) { this.title = this.createChild('div', { className: 'title' }); }
	this.content = this.createChild('div', { className: 'content' });
	this.arrow = this.createChild('div');

	if (options.channel) {
		this.addClassNames('channel' + options.channel);
	}
};

SpeechBubble.prototype._resize = function () {
	var text = this.content;
	var textWidth = text.rootElement.clientWidth;
	if (textWidth > MID_TEXT_WIDTH) {
		var width = this.contentLength < CONTENT_LENGTH_FOR_MAX_WIDTH ? MID_TEXT_WIDTH : MAX_TEXT_WIDTH;
		text.setStyle('width', width + 'px');
	}
};

SpeechBubble.prototype._setArrow = function (box) {
	this.arrow.setClassNames('arrow'); // also resets class names if _setArrow is called more than once

	// Adds proper class to the arrow element; e.g. bottomLeft means the arrow points toward bottom left
	var angle = box.angle;
	if (angle > 0) {
		if (angle > Math.PI / 2) {
			this.arrow.addClassNames('bottomLeft');
		} else {
			this.arrow.addClassNames('bottomRight');
		}
	} else {
		if (angle < -Math.PI / 2) {
			this.arrow.addClassNames('topLeft');
		} else {
			this.arrow.addClassNames('topRight');
		}
	}
};

SpeechBubble.prototype.setTitle = function (title) {
	this.title.setText(title);
};

// Returns the longest text finishing by one of the given separators
// (returned text includes last separator at the end)
function findLongestCut(txt, separators) {
	var posLastSeparator = 0;
	var whichSeparator = null;

	for (var i = 0; i < separators.length; i++) {
		var posEol = txt.lastIndexOf(separators[i]);
		if (posEol > posLastSeparator) {
			whichSeparator = separators[i];
			posLastSeparator = posEol;
		}
	}
	if (whichSeparator === null) { return null; }

	return txt.substr(0, posLastSeparator + whichSeparator.length);
}

// Splits the given text into several "pages"; returns an array strings (one per page)
function sliceTextIntoPages(txt) {
	var pages = [];
	var newPageTxt, pageStart = 0;
	var pageSuffix = '', pagePrefix = '';

	for (;;) {
		newPageTxt = txt.substr(pageStart, MAX_TEXT_PAGE);

		// If everything fits on last page => we are done
		var remainingLength = txt.length - pageStart;
		if (remainingLength < MAX_TEXT_PAGE) {
			pages.push(pagePrefix + newPageTxt);
			return pages;
		}

		var slice = findLongestCut(newPageTxt, EOS);

		// If last page would be "too short", try to make 2 last pages "more even"
		if (slice && remainingLength - slice.length < MAX_TEXT_PAGE * TOO_SHORT_PAGE) {
			var smallerSlice = findLongestCut(newPageTxt.substr(0, remainingLength * LONG_ENOUGH_PAGE), EOS);
			// Accept the smaller slice if remaining text would fit on last page; i.e. let's not create an extra page
			if (smallerSlice && remainingLength - smallerSlice.length <= MAX_TEXT_PAGE) {
				slice = smallerSlice;
			}
		}

		// If we did not find a good enough EOS
		if (!slice || slice.length < MAX_TEXT_PAGE * TOO_SHORT_PAGE) {
			var sliceAtWord = findLongestCut(newPageTxt, EOW);
			if (sliceAtWord && sliceAtWord.length >= MAX_TEXT_PAGE * LONG_ENOUGH_PAGE) {
				slice = sliceAtWord;
				pageSuffix = WILD_CUT_STR;
			}
			// Still not good cut? Take a full slice of characters
			if (!slice) {
				slice = newPageTxt;
				pageSuffix = WILD_CUT_STR;
			}
		}

		pageStart += slice.length;
		pages.push(pagePrefix + slice + pageSuffix);

		pagePrefix = pageSuffix === WILD_CUT_STR ? WILD_CUT_STR : '';
		pageSuffix = '';
	}
}

SpeechBubble.prototype._setPage = function (txt) {
	this.content.appendChild(hyperlink.process(txt));
	this.contentLength = txt.length;
};

SpeechBubble.prototype._setContent = function (msg) {
	if (typeof msg === 'string') {
		if (msg.length > MAX_TEXT_PAGE) {
			// Prepare multi-page message display
			this.nextBtn = this.createChild('div', { className: 'nextBtn' });
			this.msgPages = sliceTextIntoPages(msg);
			this.currentPage = 0;
			msg = this.msgPages[0] + BOTTOM_RIGHT_SPACING;
		}
		this._setPage(msg);
	} else if (msg instanceof WuiDom) {
		this.content.appendChild(msg);
		this.contentLength = msg.rootElement.innerText.length;
	} else {
		return console.error(new Error('SpeechBubble: unknown msg type (' + (typeof msg) + ')'));
	}
};

// Shows the next page of message; returns false if there is no "next page" to display
SpeechBubble.prototype._displayNextPage = function () {
	if (!this.msgPages) { return false; }
	if (this.currentPage >= this.msgPages.length - 1) { return false; }

	tweener.tween(this, { opacity: 0 }, { time: FADE_OUT_DELAY }, function () {
		if (!this.isAlive) { return; }

		this.currentPage++;
		if (this.currentPage === this.msgPages.length - 1) {
			this.nextBtn.hide();
		}
		var page = this.msgPages[this.currentPage] + BOTTOM_RIGHT_SPACING;
		this.content.setStyle('width', null);
		this.content.clearContent();
		this._setPage(page);

		this._resize();
		this._findPosition();
		helper.forceReflow(this);
		tweener.tween(this, { opacity: 1 }, { time: FADE_IN_DELAY });
	});
	return true;
};

SpeechBubble.prototype._openNextToActor = function () {
	this.setStyle('opacity', 0);
	window.gui.gameGuiContainer.appendChild(this);

	this._resize();

	var camera = window.isoEngine.mapScene.camera;
	if (camera.emitAtDestination) {
		camera.once('reached', this._findPositionAppearAndListen.bind(this));
	} else {
		this._findPositionAppearAndListen();
	}
};

SpeechBubble.prototype._findPositionAppearAndListen = function () {
	if (!this.isAlive) { return; }

	this._findPosition();

	this._appearAndListen();
};

SpeechBubble.prototype._findPosition = function () {
	var boxArranger = window.gui.boxArranger;
	if (this.box) { boxArranger.removeBox(this.box); }

	var box = this.box = window.gui.boxArranger.addBoxNextToActor(this.actor, this);

	this.setStyles({ left: box.x + 'px', top: box.y + 'px' });

	this._setArrow(box);
};

SpeechBubble.prototype._appearAndListen = function () {
	// Bubble closes if we disconnect
	window.gui.on('disconnect', this.closeFunc);
	// Bubble closes if we change map or reconnect (unless locked like NPC message bubble)
	if (!this.isLocked) { window.isoEngine.on('mapLoaded', this.closeFunc); }

	var isFrozen = this.isLocked || this.msgPages;
	var finalOpacity = isFrozen ? 1 : NON_FROZEN_OPACITY;

	this.tweener = tweener.tween(this, { opacity: finalOpacity }, { time: FADE_IN_DELAY }, function () {
		if (isFrozen) { return; }
		// We will close after a timeout
		var displayTime = tooltip.computeNotificationDisplayTime(this.contentLength);
		this.timeout = window.setTimeout(function (self) {
			self._dimBeforeDisappearing();
		}, displayTime, this);
	});
};

SpeechBubble.prototype._dimBeforeDisappearing = function () {
	this.tweener = tweener.tween(this, { opacity: DIMMED_OPACITY }, { time: 400 }, this._disappearLater);
};

SpeechBubble.prototype._disappearLater = function () {
	this.timeout = window.setTimeout(this.closeFunc, FADING_PERIOD);
};

// For non-locked bubbles, tapping once stops the timer; twice closes the bubble
SpeechBubble.prototype._tapHandler = function () {
	// Simple page change is default action if multiple pages
	if (this._displayNextPage()) { return; }

	if (this.isLocked) {
		if (!this.actionHandler) { return; }
		return this.actionHandler();
	}

	// If not locked and multi-pages, this means we are on last page & can close
	if (this.msgPages) { return this.close(); }

	// If timeout was already disabled we close right now
	if (!this.tweener && !this.timeout) { return this.close(); }

	this._freeze();
};

SpeechBubble.prototype._freeze = function () {
	this.addClassNames('frozen');
	this.setStyle('opacity', 1);

	// Disable our timeout and listen to foreground touch instead
	this.tweener.cancel();
	this.tweener = null;
	if (this.timeout) {
		window.clearTimeout(this.timeout);
		this.timeout = null;
	}

	window.foreground.on('dom.touchend', this.closeFunc);
};

SpeechBubble.prototype.close = function (options) {
	if (options && options.isReload) { return; } // from mapLoaded - ignore for reloads
	if (!this.isAlive) { return; } // prevents dupe calls to close()
	this.isAlive = false;

	this.setEnable(false); // no more tap while closing anim plays

	if (this.tweener) { this.tweener.cancel(); }
	window.clearTimeout(this.timeout);

	window.isoEngine.removeListener('mapLoaded', this.closeFunc);
	window.foreground.removeListener('dom.touchend', this.closeFunc);
	window.gui.removeListener('disconnect', this.closeFunc);

	if (this.closeHandler) { this.closeHandler(); }

	window.gui.boxArranger.removeBox(this.box);

	tweener.tween(this, { opacity: 0 }, { time: FADE_OUT_DELAY }, this.destroy);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/SpeechBubble/index.js
 ** module id = 576
 ** module chunks = 0
 **/