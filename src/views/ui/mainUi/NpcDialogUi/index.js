require('./styles.less');
var Button = require('Button');
var dimensions = require('dimensionsHelper').dimensions;
var helper = require('helper');
var inherits = require('util').inherits;
var SwipingTabs = require('SwipingTabs');
var WuiDom = require('wuidom');

var FADE_IN_DELAY = 150; // ms

var MARGIN_BUBBLES = 10; // px - margin between UI and any speech bubble around
var MARGIN_BOTTOM = 4; // px
var MARGIN_SIDE = 10; // px

var MAX_REPLY_PER_TAB = 4;

var BUTTON_LINE_HEIGHT = 22; // px

var BUTTON_BASE_HEIGHT = 50; // px - minimum height our reply buttons could be (we make them bigger)
var BUTTON_MIN_HEIGHT = 70; // px - we give all buttons at least this height (and more if text does not fit)

// For each possible number of buttons we set a size to make them nicely aligned.
// E.g. for 6 buttons, we set 33% to get 2 rows of 3 buttons.
var BUTTON_WIDTH = {
	1: '100%',
	2: '50%',
	3: '33.3%',
	4: '25%'
};
var DEF_BUTTON_WIDTH = '25%'; // for any number of buttons not in the table above

var FRAME_WIDTH = {
	1: '40%',
	2: '60%'
};
var DEF_FRAME_WIDTH = '100%';

/** @class */
function NpcDialogUi() {
	WuiDom.call(this, 'div', { className: 'npcDialogUi', hidden: true });

	this.inDialog = false;
	this.replyHandler = null;
	this.npcName = null;
	this.currentMsg = null;
	this.msgBubble = null;
	this.singleMsgBubbles = {};
	this.isZoomed = false;
	this.isChangingZoom = false;
	this.uiBox = null; // UI box in BoxArranger

	window.gui.on('disconnect', this._closeDialog.bind(this));
	this.highlightRepliesFunc = this._highlightReplies.bind(this);
}
inherits(NpcDialogUi, WuiDom);
module.exports = NpcDialogUi;


NpcDialogUi.prototype._closeDialog = function () {
	if (!this.inDialog) { return; }
	this.inDialog = false;

	window.foreground.removeListener('dom.touchend', this.highlightRepliesFunc);

	if (this.replyHandler) { this.replyHandler(null); }
	if (this.msgBubble) {
		this.msgBubble.close();
		this.msgBubble = null;
	}
	this.hide();
	this._restoreZoom();

	window.gui.boxArranger.removeBox(this.uiBox);
	this.uiBox = null;

	this.emit('closed'); // mostly for tutorial or tests
};

function closeBtnHandler() {
	// "this" is the close button
	this.myUi._sendReply(null);
}

function replyTapHandler() {
	// "this" is the reply button
	this.myUi._sendReply(this.replyId);
}

function leftBtnHandler() {
	// "this" is the left button
	var replyTabs = this.myUi.replyTabs;
	replyTabs.swipeNegative();
}
function rightBtnHandler() {
	// "this" is the right button
	var replyTabs = this.myUi.replyTabs;
	replyTabs.swipePositive();
}
function tabSwitchHandler() {
	// "this" is the SwipingTabs
	var self = this.myUi;
	self.leftBtn.setEnable(!!this.leftTab);
	self.rightBtn.setEnable(!!this.rightTab);
}

NpcDialogUi.prototype._newButton = function (parent, className, handler) {
	var btn = parent.appendChild(new Button({ className: className, addIcon: true }, handler));
	btn.myUi = this;
	return btn;
};

NpcDialogUi.prototype._createContent = function () {
	this.setStyles({
		left: dimensions.mapLeft + MARGIN_SIDE + 'px',
		width: dimensions.mapWidth - 2 * MARGIN_SIDE + 'px',
		bottom: dimensions.screenHeight - dimensions.screenExceptToolbar.height + MARGIN_BOTTOM + 'px'
	});

	var frame = this.frame = this.createChild('div', { className: 'frame' });

	this.leftBtn = this._newButton(frame, 'leftBtn', leftBtnHandler);

	var tabs = this.replyTabs = frame.appendChild(new SwipingTabs({ noHeader: true, noCycling: true }));
	tabs.myUi = this;
	tabs.on('openTab', tabSwitchHandler);

	this.replyElts = []; // created later in _prepareReplyButtons
	this.replyBoxes = [];
	this.numReplyTabs = 0;
	this.numUsedReplyTabs = 0;

	this.rightBtn = this._newButton(frame, 'rightBtn', rightBtnHandler);
	this.closeBtn = this._newButton(frame, 'closeBtn', closeBtnHandler);
};

function setReply(elt, id, text, width, height) {
	elt.replyId = id;
	elt.setText(text);
	elt.enable();
	elt.setStyles({ width: width, lineHeight: BUTTON_LINE_HEIGHT + 'px', minHeight: height + 'px' });
	elt.show();
}

// Create new reply buttons if needed; hide extra ones if any
NpcDialogUi.prototype._prepareReplyButtons = function () {
	var replies = this.replies;
	var numNeededReplies = replies.length;
	var numTabs = Math.ceil(numNeededReplies / MAX_REPLY_PER_TAB);

	for (var i = this.numReplyTabs; i < numTabs; i++) {
		var replyBox = this.replyBoxes[i] = new WuiDom('div', { className: 'replyBox' });
		this.replyTabs.addTab('', replyBox, i);
		this.numReplyTabs++;
		for (var j = 0; j < MAX_REPLY_PER_TAB; j++) {
			var btn = replyBox.appendChild(new Button({ className: 'reply' }, replyTapHandler));
			btn.myUi = this;
			this.replyElts.push(btn);
		}
	}
	// Hide the remaining (not used) reply buttons
	for (i = numNeededReplies; i < this.replyElts.length; i++) {
		this.replyElts[i].hide();
	}

	// Hide/show appropriate tabs & buttons left/right
	this.leftBtn.toggleDisplay(numTabs > 1);
	this.rightBtn.toggleDisplay(numTabs > 1);
	this.replyBoxes[0].setStyle('textAlign', numTabs > 1 ? 'left' : 'center'); // so last tab looks nicer

	for (i = this.numUsedReplyTabs; i < this.numReplyTabs; i++) {
		this.replyTabs.toggleTabAvailability(i, i < numTabs);
	}
	this.numUsedReplyTabs = numTabs;

	var width = BUTTON_WIDTH[numNeededReplies] || DEF_BUTTON_WIDTH;
	for (i = 0; i < numNeededReplies; i++) {
		setReply(this.replyElts[i], i, replies[i], width, BUTTON_BASE_HEIGHT);
	}
};

NpcDialogUi.prototype._setAllReplyBoxesVisibility = function (shouldShow) {
	for (var i = 0; i < this.numUsedReplyTabs; i++) {
		this.replyBoxes[i].toggleDisplay(shouldShow);
	}
};

NpcDialogUi.prototype._resizeAndAppear = function (isFirstQuestion) {
	// Make CSS compute sizes
	this.replyTabs.setStyle('opacity', 0);
	this._setAllReplyBoxesVisibility(false); // CSS is faster if we hide while moving things around
	this._prepareReplyButtons();
	this._setAllReplyBoxesVisibility(true);
	if (isFirstQuestion) {
		this.setStyle('opacity', 0);
		this.show();
	}

	var frameWidth = FRAME_WIDTH[this.replies.length] || DEF_FRAME_WIDTH;
	this.frame.setStyles({ width: frameWidth });

	// Find buttons' maximum height
	var height;
	var maxHeight = BUTTON_MIN_HEIGHT;
	var replies = this.replies;
	for (var i = 0; i < replies.length; i++) {
		height = this.replyElts[i].rootElement.offsetHeight;
		maxHeight = Math.max(maxHeight, height);
	}
	// Use this height for swiping tabs' content
	this.replyTabs.setStyle('min-height', maxHeight + 'px');

	// Force same height for all buttons
	for (i = 0; i < replies.length; i++) {
		var btn = this.replyElts[i];
		height = btn.rootElement.offsetHeight;
		if (height === maxHeight) { continue; }
		var numLines = 1 + (height - BUTTON_BASE_HEIGHT) / BUTTON_LINE_HEIGHT;
		var newLineHeight = Math.round(BUTTON_LINE_HEIGHT + (maxHeight - height) / numLines);
		btn.setStyles({ 'line-height': newLineHeight + 'px', minHeight: maxHeight + 'px' });
	}

	this.replyTabs.reopen();
	this.leftBtn.setEnable(!!this.replyTabs.leftTab);
	this.rightBtn.setEnable(!!this.replyTabs.rightTab);
	this.closeBtn.toggleDisplay(!window.gui.tutorialManager.inTutorial);
	this.replyTabs.setStyle('opacity', 1);

	if (isFirstQuestion) {
		// Inform the BoxArranger so it does not create bubble under our UI
		var elt = this.rootElement;
		this.uiBox = window.gui.boxArranger.addObstacle(0, elt.offsetTop - MARGIN_BUBBLES,
			dimensions.screenWidth, elt.offsetHeight);

		this._waitZoomChange(this._appear); // NB: "this" is passed by _waitZoomChange
	}
};

NpcDialogUi.prototype._appear = function () {
	helper.showProgressively(this, FADE_IN_DELAY);
};

NpcDialogUi.prototype._waitZoomChange = function (cb) {
	if (!this.isChangingZoom) { return cb && cb.call(this); }

	var self = this;
	var camera = window.isoEngine.mapScene.camera;
	camera.once('reached', function () {
		if (self.isChangingZoom) {
			self.isChangingZoom = false;
			if (self.isZoomed) {
				camera.freeze();
			}
		}
		return cb && cb.call(self);
	});
};

NpcDialogUi.prototype._zoomOnActor = function (cb) {
	if (this.isZoomed) {
		return this._waitZoomChange(cb);
	}
	this.isZoomed = true;
	this.isChangingZoom = true;

	var bbox = this.actor.bbox;
	var camera = window.isoEngine.mapScene.camera;
	this.previousZoom = camera.zoom;
	this.previousCameraX = camera.x;
	this.previousCameraY = camera.y;

	if (camera.zoom !== camera.maxZoom) { camera.zoomTo(camera.maxZoom); }
	// Note we center on top-right corner of actor's bbox; makes bubble closer to replies
	camera.moveTo(bbox[1], bbox[2], true);

	this._waitZoomChange(cb);
};

NpcDialogUi.prototype._restoreZoom = function (cb) {
	if (!this.isZoomed) {
		return this._waitZoomChange(cb);
	}
	this.isZoomed = false;
	this.isChangingZoom = true;

	var camera = window.isoEngine.mapScene.camera;
	camera.unfreeze();
	if (camera.zoom !== this.previousZoom) { camera.zoomTo(this.previousZoom); }
	camera.moveTo(this.previousCameraX, this.previousCameraY, true);

	this._waitZoomChange(cb);
};

NpcDialogUi.prototype._sendReply = function (replyId) {
	var replyHandler = this.replyHandler;
	if (!replyHandler) { return; } // reply already sent
	this.replyHandler = null;

	if (replyId !== null) { this.replyElts[replyId].disable(); }

	if (this.msgBubble) {
		this.msgBubble.close();
		this.msgBubble = null;
	}

	replyHandler(replyId);
};

NpcDialogUi.prototype._bubbleTapHandler = function () {
	if (this.replies.length === 1) {
		return this._sendReply(0);
	}
	this._highlightReplies();
};

NpcDialogUi.prototype._showLockedBubble = function () {
	if (!this.replyHandler) { return; } // happens if player taps response button before the bubble appears
	if (!this.bubbleTapHandler) { this.bubbleTapHandler = this._bubbleTapHandler.bind(this); }

	this.msgBubble = window.gui.newSpeechBubble({
		msg: this.currentMsg,
		title: this.npcName,
		actor: this.actor,
		isLocked: true,
		action: this.bubbleTapHandler
	});
};

NpcDialogUi.prototype._showSingleMsgBubble = function () {
	var self = this;
	var npcName = this.npcName;

	this.singleMsgBubbles[npcName] = window.gui.newSpeechBubble({
		msg: this.currentMsg,
		title: npcName,
		actor: this.actor,
		onClose: function () { delete self.singleMsgBubbles[npcName]; }
	});
	this.replyHandler(null);
};

NpcDialogUi.prototype._closeSingleMsgBubbles = function () {
	for (var npcName in this.singleMsgBubbles) {
		this.singleMsgBubbles[npcName].close();
	}
};

// Draws attention of the player on the reply buttons
NpcDialogUi.prototype._highlightReplies = function () {
	var highlight = this.frame.createChild('div', { className: 'highlight' });
	window.setTimeout(function () {
		highlight.destroy();
	}, 250);
};

// Displays the received message and replies
NpcDialogUi.prototype._showQuestion = function () {
	if (!this.frame) { this._createContent(); }

	var isFirstQuestion = !this.inDialog;
	this.inDialog = true;

	// If previous "single bubble" are still open, close them; we start a clean new dialog
	this._closeSingleMsgBubbles();

	if (isFirstQuestion) {
		this._zoomOnActor(this._showLockedBubble);
	} else {
		this._showLockedBubble();
	}

	this._resizeAndAppear(isFirstQuestion);

	if (isFirstQuestion) { window.foreground.on('dom.touchend', this.highlightRepliesFunc); }
	this.emit('opened'); // mostly for tutorial or tests
};

NpcDialogUi.prototype.prepareForNextQuestion = function (npcData, numReplies) {
	if (!numReplies) {
		this._restoreZoom();
	} else {
		if (!this.inDialog) {
			this.actor = window.actorManager.getActorFromNpcId(npcData.id);
			this._zoomOnActor();
		}
	}
};

/**
 * Opens the NPC dialog window and waits for the user's reply. Calls the callback when user replies.
 * @param {string|WuiDom} msg - the message as a string or a WuiDom
 * @param {string[]} replies - array of possible replies
 * @param {function} replyHandler - will be called as replyHandler(id)
 *                     with id=0,1,2 like the index of the reply chosen, or null if no choice was made (window closed)
 * @param {object} [options]
 * @param {object} [options.npcData] - NPC data (has id and nameId info, for example)
 * @param {Actor} [options.actor] - if not given, actor will be deduced from npcData
 * @return {boolean} - true if dialog goes on, false if it can be closed right away
 */
NpcDialogUi.prototype.showNpcQuestion = function (msg, replies, replyHandler, options) {
	options = options || {};
	this.replies = replies;
	this.replyHandler = replyHandler;
	this.actor = options.actor || window.actorManager.getActorFromNpcId(options.npcData.id);
	this.npcName = options.npcData && options.npcData.nameId;
	this.currentMsg = msg;

	if (replies.length === 0) {
		// Ignore & terminate dialog right away if message from same NPC is still visible
		if (this.singleMsgBubbles[this.npcName]) { return replyHandler(null); }

		this._restoreZoom(this._showSingleMsgBubble);
	} else {
		this._showQuestion();
	}
};

NpcDialogUi.prototype.leaveDialog = function () {
	this._closeDialog();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/NpcDialogUi/index.js
 ** module id = 505
 ** module chunks = 0
 **/