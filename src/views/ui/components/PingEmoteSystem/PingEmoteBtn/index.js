require('./styles.less');
var Button = require('Button');
var WuiDom = require('wuidom');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var dimensions = require('dimensionsHelper').dimensions;
var constants = require('constants');
var getExclusiveSelectorByGroup = require('ExclusiveSelector').getExclusiveSelectorByGroup;

function PingBtn() {
	WuiDom.call(this, 'div', { className: 'PingBtn' });

	var self = this;

	this._isActivated = false;

	var content = this.createChild('div', { className: 'borderBox' });
	this._pingBtn = content.appendChild(new Button({
		className: 'pingBtn',
		scaleOnPress: true,
		tooltip: getText('tablet.pingsystem.pingsystem'),
		hidden: true
	}, function () {
		// we can activate it exclusively in fight
		if (!window.gui.playerData.isFighting) {
			return;
		}
		self.setActivateMode(!self._isActivated);
		self.emit('pingBtnActivate', self._isActivated);
	}));

	this._emoteBtn = content.appendChild(new Button({
		className: 'emoteBtn',
		tooltip: getText('tablet.common.emotesAndSmilies')
	}, function () {
		if (window.gui.playerData.isFighting) {
			return;
		}
		this._isActivated = false;
		self.setActivateMode(false);
		self.emit('emoteBtnTap');
	}));

	this._setupEvents();
	this._resize();
	this.exclusiveSelector = getExclusiveSelectorByGroup('shortcutSlots');
	this.exclusiveSelector.register(this);
}

inherits(PingBtn, WuiDom);
module.exports = PingBtn;

/**
 * All the events the ping button should listen on
 * @private
 */
PingBtn.prototype._setupEvents = function () {
	var self = this;
	var gui = window.gui;

	// on resize the UI. Before the fight a resize is emitted, so we can use it to put the button at the right place

	gui.on('resize', function () {
		self._resize();
	});
};

/**
 * Resize the UI on the resize event from the GUI
 * @private
 */
PingBtn.prototype._resize = function () {
	var pingBtnSize = dimensions.pingEmoteBtnSize;
	if (window.gui.ipadRatio) {
		this.setStyles({
			top: '',
			right: '',
			left: dimensions.posPingEmoteBtn + 'px',
			bottom: '0',
			width: pingBtnSize + 'px',
			height: dimensions.bottomBarHeight + 'px'
		});
	} else {
		this.setStyles({
			bottom: '',
			left: '',
			right: '0',
			top: dimensions.posPingEmoteBtn + 'px',
			width: constants.PING_EMOTE_BTN_WIDE_MIN_WIDTH + 'px',
			height: pingBtnSize + 'px'
		});
	}
};

/**
 * Activate or de-activate the style of the button
 * @param {boolean} activate
 * @private
 */
PingBtn.prototype.setActivateMode = function (activate) {
	var pingBtn = this._pingBtn;
	pingBtn.toggleClassName('on', activate);
	this._isActivated = activate;
	this.emit('selected', activate);
	this.emit('pingBtnActivate', activate);
};

PingBtn.prototype.select = function (toggle) {
	this.setActivateMode(toggle);
};

PingBtn.prototype.enterFightState = function () {
	this._pingBtn.show();
	this._emoteBtn.hide();
	this._resize();
};

PingBtn.prototype.enterRolePlayState = function () {
	this._emoteBtn.show();
	this._pingBtn.hide();
	this._resize();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PingEmoteSystem/PingEmoteBtn/index.js
 ** module id = 552
 ** module chunks = 0
 **/