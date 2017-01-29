require('./styles.less');
var dimensions = require('dimensionsHelper').dimensions;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var channelsEnum = require('ChatActivableChannelsEnum');

var MARGIN_FROM_CORNER = 10;

// TODO: this map will be user customizable via an option menu in the future (DOT-763)
var MUTED_CHANNELS_CODE = {
	PSEUDO_CHANNEL_FIGHT_LOG: true
};

function TextNotification() {
	WuiDom.call(this, 'div', { className: 'TextNotification' });

	var self = this;
	window.gui.on('resize', function () {
		// Just above bottom-left corner of the map
		self.setStyles({
			left: dimensions.mapLeft + MARGIN_FROM_CORNER + 'px',
			bottom: dimensions.screenHeight - dimensions.mapBottom + MARGIN_FROM_CORNER + 'px'
		});
	});

	// transform channels code map into an id map for easier use
	this.mutedChannelsId = {};
	for (var mutedChannelCode in MUTED_CHANNELS_CODE) {
		this.mutedChannelsId[channelsEnum[mutedChannelCode]] = true;
	}
}

inherits(TextNotification, WuiDom);
module.exports = TextNotification;

TextNotification.prototype.add = function (textOrWuidom, options) {
	options = options || {};
	var bubble = this.createChild('div', { className: 'bubble' });
	var bubbleText = bubble.createChild('div', { className: 'bubbleText' });
	bubble.addClassNames(options.className);

	var channel = options.channel;
	if (channel === undefined) { channel = channelsEnum.PSEUDO_CHANNEL_INFO; }
	bubble.addClassNames('channel' + channel);

	if (typeof textOrWuidom === 'object') {
		bubbleText.appendChild(textOrWuidom);
	} else {
		bubbleText.setHtml(textOrWuidom.toString());
	}

	setTimeout(function () {
		bubble.addClassNames('on');
		// we want to resurect this later through options
		/*if (channel !== channelsEnum.CHANNEL_GLOBAL && !self.mutedChannelsId[channel]) {
			playUiSound('POPUP_INFO');
		}*/
	}, 50);

	function removeBubble(bubble) {
		bubble.delClassNames('on');
		setTimeout(function () {
			bubble.destroy();
		}, 300);
	}

	setTimeout(function () {
		if (bubble.rootElement) {
			removeBubble(bubble);
		}
	}, 7000);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/TextNotification/index.js
 ** module id = 464
 ** module chunks = 0
 **/