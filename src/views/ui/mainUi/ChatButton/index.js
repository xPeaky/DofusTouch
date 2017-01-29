require('./styles.less');
var constants = require('constants');
var dimensions = require('dimensionsHelper').dimensions;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var Button = require('Button');

function ChatButton() {
	WuiDom.call(this, 'div', { className: 'ChatButton' });

	var picto = this.createChild('div', { className: 'buttonChatPicto' });
	picto.appendChild(new Button({ className: 'buttonChatTouchZone' }, function () {
		if (window.gui.chat.active) {
			window.gui.chat.deactivate();
		} else {
			window.gui.chat.activate();
		}
	}));

	var self = this;

	window.gui.on('resize', function () {
		if (this.ipadRatio) {
			self.setStyles({
				left: dimensions.posChatBtn + 'px',
				right: 'auto',
				top: 'auto',
				bottom: 0,
				width: constants.CHAT_BTN_MIN_WIDTH + 'px',
				height: dimensions.bottomBarHeight + 'px'
			});
		} else {
			var width, right;
			width = (dimensions.sideBarWidth - constants.PING_EMOTE_BTN_WIDE_MIN_WIDTH);
			right = constants.PING_EMOTE_BTN_WIDE_MIN_WIDTH;
			self.setStyles({
				left: 'auto',
				right: right + 'px',
				top: dimensions.posChatBtn + 'px',
				bottom: 'auto',
				width: width + 'px',
				height: constants.CHAT_BTN_MIN_HEIGHT + 'px'
			});
		}
	});
}
inherits(ChatButton, WuiDom);
module.exports = ChatButton;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/ChatButton/index.js
 ** module id = 459
 ** module chunks = 0
 **/