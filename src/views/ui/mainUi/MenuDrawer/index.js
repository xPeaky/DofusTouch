require('./styles.less');
var inherits = require('util').inherits;
var SwipingDrawer = require('SwipingDrawer');
var Button = require('Button');
var getText = require('getText').getText;
var userPref = require('UserPreferences');


function MenuDrawer(options) {
	options = options || {};
	SwipingDrawer.call(this, {
		className: 'MenuDrawer',
		background: true,
		autoClose: options.autoClose,
		backDrawerSize: options.backDrawerSize
	});

	this.shouldKeepOpen = false; // set to true by derived class if drawer should stay open after resize

	var self = this;
	var arrowButton;

	function resize() {
		var wasOpen = self.isOpen;

		self._resize();

		window.setTimeout(function () {
			if (self.getCurrentDrawerSize() >= self.getCurrentContentSize()) {
				self.setAsAlwaysOpen(true);
				arrowButton.hide();
			} else {
				self.setAsAlwaysOpen(false);
				arrowButton.show();
			}

			self.refresh();
			if (wasOpen && self.shouldKeepOpen) { self.open(); }
		}, 0);
	}

	window.gui.once('connected', function () {
		this.on('resize', function () {
			resize();
		});
		resize();
	});

	window.gui.on('disconnect', function () {
		self.close();
	});

	this.content.createChild('div', { className: 'topBorder' });

	arrowButton = this.content.createChild('div', { className: 'arrowBtnBg' });

	arrowButton.appendChild(new Button({ className: 'arrowBtn' }, function () {
		if (self.isOpen) {
			self.close();
		} else {
			self.open();
		}
	}));

	var alreadyShownTip = userPref.getValue('tablet.tutorial.canSwipeDrawer');
	if (!alreadyShownTip) {
		arrowButton.once('tap', function () {
			var notificationBar = window.gui.notificationBar;
			var desc = {
				type: notificationBar.notificationType.PRIORITY_INVITATION,
				title: getText('tablet.tutorial.tip'),
				text: getText('tablet.tutorial.canSwipeDrawer')
			};
			notificationBar.newNotification('tip canSwipeDrawer', desc);
			userPref.setValue('tablet.tutorial.canSwipeDrawer', true);
		});
	}

	this.createChild('div', { className: 'borderBox' });
}
inherits(MenuDrawer, SwipingDrawer);

module.exports = MenuDrawer;

/**
 * That function will be override, it's more a placeholder if not
 * @private
 */
MenuDrawer.prototype._resize = function () {};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/MenuDrawer/index.js
 ** module id = 490
 ** module chunks = 0
 **/