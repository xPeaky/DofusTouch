require('./styles.less');
var ChatIcons = require('ChatIcons');
var WuiDom = require('wuidom');
var inherits = require('util').inherits;
var dimensions = require('dimensionsHelper').dimensions;
var constants = require('constants');
var tweener = require('tweener');

function EmoteBox() {
	WuiDom.call(this, 'div', {
		className: 'EmoteBox'
	});
	this._chatIcons = new ChatIcons();
	this.appendChild(this._chatIcons);
	var self = this;
	this._chatIcons.on('closing', function () {
		self.hide();
	});

	this.isOpen = false;
	this._emoteBoxSize = 85;
	this._time = 200;
	this._delay = 0;
	this._easing = 'ease-out';
}

inherits(EmoteBox, WuiDom);
module.exports = EmoteBox;

EmoteBox.prototype.refreshPosition = function () {
	//this._chatIcons.positionPanel();
	if (window.gui.ipadRatio) {
		this._chatIcons.setPanelsStyle('right', 'auto');
		this._chatIcons.setPanelsStyle('left', dimensions.pingEmoteBtnSize + 'px');
		this._chatIcons.setPanelsStyle('bottom', this._emoteBoxSize + 'px');
		this.setStyle('left', constants.CHAT_BTN_MIN_WIDTH + 'px');
		this.setStyle('width', dimensions.pingEmoteBtnSize + 'px');
		this.setStyle('height', this._emoteBoxSize + 'px');
		this.setStyle('bottom', dimensions.bottomBarHeight + 'px');
		this.setStyle('line-height', 'inherit');
	} else {
		this._chatIcons.setPanelsStyle('left', 'auto');
		this._chatIcons.setPanelsStyle('right', this._emoteBoxSize + 'px');
		this._chatIcons.setPanelsStyle('bottom', dimensions.pingEmoteBtnSize + 'px');
		this.setStyle('left', (dimensions.mapRight - this._emoteBoxSize) + 'px');
		this.setStyle('width', this._emoteBoxSize + 'px');
		this.setStyle('height', dimensions.pingEmoteBtnSize + 'px');
		this.setStyle('bottom', 0 + 'px');
		this.setStyle('line-height', dimensions.pingEmoteBtnSize + 'px');
	}
};

EmoteBox.prototype.show = function () {
	var self = this;
	self.setStyle('visibility', 'visible');
	tweener.tween(this,
			{ webkitTransform: 'translate3d(0, 0, 0)' },
			{ time: this._time, delay: this._delay, easing: this._easing },
			function () {
				self.isOpen = true;
			}
	);
};

EmoteBox.prototype.hide = function () {
	var self = this;
	if (window.gui.ipadRatio) {
		tweener.tween(this,
				{ webkitTransform: 'translate3d(0, ' + this._emoteBoxSize + 'px, 0)' },
				{ time: this._time, delay: this._delay, easing: this._easing },
				function () {
					self.setStyle('visibility', 'collapse');
					self.isOpen = false;
				}
		);
	} else {
		tweener.tween(this,
				{ webkitTransform: 'translate3d(' + this._emoteBoxSize + 'px, 0, 0)' },
				{ time: this._time, delay: this._delay, easing: this._easing },
				function () {
					self.setStyle('visibility', 'collapse');
					self.isOpen = false;
				}
		);
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PingEmoteSystem/EmoteBox/index.js
 ** module id = 558
 ** module chunks = 0
 **/