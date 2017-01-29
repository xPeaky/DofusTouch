require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var Button = require('Button');
var windowsManager = require('windowsManager');
var dimensions = require('dimensionsHelper').dimensions;
var playUiSound = require('audioManager').playUiSound;

function RewardsIndicator() {
	Button.call(this, { scaleOnPress: true, className: 'RewardsIndicator', hidden: true }, function () {
		windowsManager.switch('rewardsPending');
	});
	var self = this;

	window.gui.on('disconnect', function () {
		self.hide();
	});

	window.gui.on('resize', function () {
		self._initPosition();
	});

	this.on('show', function () {
		playUiSound('NEW_REWARD');
	});
}

inherits(RewardsIndicator, WuiDom);
module.exports = RewardsIndicator;

RewardsIndicator.prototype._initPosition = function () {
	// Center it along bottom of map
	this.setStyle('left', dimensions.mapLeft + (dimensions.mapWidth / 2) - 32 + 'px');
	this.setStyle('top', dimensions.mapBottom - 64 + 'px');
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/RewardsIndicator/index.js
 ** module id = 549
 ** module chunks = 0
 **/