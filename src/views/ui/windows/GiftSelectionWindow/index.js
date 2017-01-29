require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var getText = require('getText').getText;
var ItemSpace = require('GiftSelectionWindow/ItemSpace');
var CharactersSpace = require('GiftSelectionWindow/CharactersSpace');
var DofusButton = require('Button').DofusButton;
var tweener = require('tweener');

function GiftSelectionWindow() {
	Window.call(this, {
		className: 'GiftSelectionWindow',
		title: getText('ui.connection.giftReceived'),
		noCloseButton: true,
		positionInfo: {
			left: 'c',
			top: 'c',
			width: 800,
			height: 520
		}
	});

	var self = this;

	this._giftList = [];
	this._giftListIndex = 0;
	this._hasDom = false;

	this._itemSpace = null;
	this._charactersSpace = null;
	this._selectedCharaId = null;

	this.on('open', function (giftList) {
		self._characterList = window.gui.gifts.getCharaListMinusDeadPeople();
		self._giftList = giftList || [];

		// create all dom

		self._createDom();
		self._setupEvents();
		self._updateCharactersSpace();
		self._updateGift();
	});

	this.on('open', function () {
		window.foreground.lock('giftAttribution');
		// TODO: we may want to open a dark overlay here
	});

	this.on('close', function () {
		window.foreground.unlock('giftAttribution');
		self._reset();
	});
}

inherits(GiftSelectionWindow, Window);
module.exports = GiftSelectionWindow;

/**
 * Destroy the full window
 * @private
 */
GiftSelectionWindow.prototype._reset = function () {
	this.windowBody.clearContent();
	this._hasDom = false;
	this._giftListIndex = 0;
	this._giftList = [];
	this._itemSpace = null;
	this._charactersSpace = null;
};

/**
 * @private
 */
GiftSelectionWindow.prototype._setupEvents = function () {
	var self = this;
	window.gui.gifts.on('giftAssignRequestResult', function (msg) {
		if (!self.openState) { return; }
		var gift = self._giftList[self._giftListIndex];
		if (!gift || msg.actionId !== gift.uid) { return; }
		self._charactersSpace.setAssignLoading(false);
		self._nextGift();
	});
};

/**
 * Create all the structure dom
 * @private
 */
GiftSelectionWindow.prototype._createDom = function () {
	var self = this;
	if (this._hasDom) {
		return;
	}

	var content = this.windowBody;

	// item space (left)

	var left = content.createChild('div', { className: 'left' });
	this._itemSpace = left.appendChild(new ItemSpace());

	// characters space (right)

	var right = content.createChild('div', { className: 'right' });
	this._charactersSpace = right.appendChild(new CharactersSpace());
	this._charactersSpace.on('selectTile', function (id) {
		self._selectedCharaId = id;
		self._assignBtn.enable();
	});

	// buttons space

	var buttonSpace = content.createChild('div', { className: 'buttonSpace' });
	buttonSpace.appendChild(new DofusButton(getText('ui.connection.notNow'), {
		scaleOnPress: true,
		className: 'buttonSpaceButton'
	}, function () {
		self._nextGift();
	}));

	this._assignBtn = buttonSpace.appendChild(new DofusButton(getText('ui.connection.assignGift'), {
		disable: true,
		scaleOnPress: true,
		className: 'buttonSpaceButton'
	}, function () {
		self._assignBtn.disable();
		self._charactersSpace.setAssignLoading(true);
		self._assignGift();
	}));

	this._hasDom = true;
};

/**
 * Update the window with the next gift
 * @private
 */
GiftSelectionWindow.prototype._nextGift = function () {
	var self = this;

	var isLastGift = this._giftListIndex + 1 >= this._giftList.length;
	if (isLastGift) {
		return this.close();
	}

	this._giftListIndex += 1;

	this._selectedCharaId = null;
	this._charactersSpace.reset();

	// play the close tweener for better understanding of an update

	var x = this.position.x;
	var y = this.position.y;
	tweener.tween(this, {
		opacity: 0,
		webkitTransform: 'translate3d(' + x + 'px,' + y + 'px,0) scale(0.8)'
	}, {
		time: 150,
		delay: 0,
		easing: 'ease-out'
	}, function () {
		tweener.tween(self, {
			opacity: 1,
			webkitTransform: 'translate3d(' + x + 'px,' + y + 'px,0)  scale(1)'
		}, {
			time: 150,
			delay: 0,
			easing: 'ease-out'
		}, function () {
			self._updateGift();
		});
	});
};

/**
 * Assign a gift to a character id
 * @private
 */
GiftSelectionWindow.prototype._assignGift = function () {
	if (!this._selectedCharaId) {
		return;
	}
	var gift = this._giftList[this._giftListIndex];
	if (!gift) {
		return;
	}
	window.gui.gifts.assignGift(gift.uid, this._selectedCharaId);
};

/**
 * Update with the current gift
 * @private
 */
GiftSelectionWindow.prototype._updateGift = function () {
	var gift = this._giftList[this._giftListIndex] || {};
	this._itemSpace.update(gift);
};

GiftSelectionWindow.prototype._updateCharactersSpace = function () {
	this._charactersSpace.update(this._characterList);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/GiftSelectionWindow/index.js
 ** module id = 695
 ** module chunks = 0
 **/