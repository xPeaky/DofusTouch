require('./styles.less');
var assetPreloading = require('assetPreloading');
var inherits = require('util').inherits;
var gripBehavior = require('gripBehavior');
var positionHelper = require('positionHelper');
var tweener = require('tweener');
var Button = require('Button');
var WuiDom = require('wuidom');
var playUiSound = require('audioManager').playUiSound;

var enums = require('./enums.js');
var notificationImageInfo = enums.notificationImageInfo;

var DEFAULT_ICON = 12; // question mark icon
var DEFAULT_COLOR = 'blue';

function NotificationBar() {
	WuiDom.call(this, 'div', { className: 'NotificationBar', hidden: true });

	// enums
	this.notificationType = enums.notificationType;

	gripBehavior(this);

	this.currentOpenedId = null;
	this.dialogs = {};

	this.container = this.createChild('div', { className: 'container' });
	this.counter = this.createChild('div', { className: 'counter' });

	var self = this;
	this.on('dragStart', function () {
		self.hideDialog(self.currentOpenedId);
	});

	window.gui.on('disconnect', function () {
		self.clearNotifications();
	});
}
inherits(NotificationBar, WuiDom);
module.exports = NotificationBar;


NotificationBar.prototype._updateCounter = function () {
	var total = this.container.getChildren().length;

	this.counter.setText(total);
	this.toggleDisplay(total);
};

/** Places dialog next to notification button */
NotificationBar.prototype._repositionDialog = function (id) {
	var dialog = this.dialogs[id];
	var notifBtn = this.container.getChild(id);
	positionHelper.positionNextTo(dialog, notifBtn);
};

NotificationBar.prototype._destroyNotification = function (id, exiting) {
	if (!this.dialogs[id]) { return; }

	this.dialogs[id].destroy();
	delete this.dialogs[id];

	var notifBtn = this.container.getChild(id);

	// cancel the tween before we destroy notifBtn
	var icon = notifBtn.getChild('icon');
	if (typeof icon.cancelTween === 'function') {
		icon.cancelTween();
	}

	notifBtn.destroy();

	this._updateCounter();

	//--- update UI once notif button and dialog are gone
	if (exiting) { return; } // we are closing the UI anyway
	if (!this.currentOpenedId) { return; } // no dialog opened, all is good

	// if we are closing the currently opened dialog, show the latest dialog instead
	if (id === this.currentOpenedId) {
		this.currentOpenedId = null;
		var allNotifs = this.container.getChildren();
		if (allNotifs.length) {
			var notifId = allNotifs[allNotifs.length - 1].getWuiName();
			this.showDialog(notifId, true); // show the dialog of the last notification
		}
	} else { // otherwise we update the position of the current one since notification buttons may have moved
		this._repositionDialog(this.currentOpenedId);
	}
};

NotificationBar.prototype.clearNotifications = function () {
	for (var id in this.dialogs) {
		this._destroyNotification(id, true);
	}

	this.currentOpenedId = null;
};

NotificationBar.prototype._notificationButtonAction = function (id) {
	// if the dialog of this notification is visible we toggle it off
	if (this.currentOpenedId === id) {
		return this.hideDialog(id);
	}
	// close the current one and open this one instead
	this.showDialog(id);
};

/** Creates the "dialog" (i.e. the deployed part next to notification button) */
NotificationBar.prototype._createDialog = function (notifId, desc) {
	var self = this;

	function closeButtonAction() {
		self.removeNotification(notifId);
		if (desc.onClose) { desc.onClose(-1); }
	}

	function buttonAction() {
		var ndx = this.index;
		var result = desc.buttons[ndx].action(ndx);
		// check if the action function returned specific values
		switch (result) {
		case 'HIDE_DIALOG': // only "hide" the notification text (the icon remains)
			self.hideDialog(notifId);
			break;
		default: // default is to close the notification
			self.removeNotification(notifId);
		}
	}

	var content = new WuiDom('div');
	content.createChild('div', { className: 'dialogTitle', text: desc.title });
	content.appendChild(new Button({ className: 'closeBtn' }, closeButtonAction));

	if (desc.wuidom) {
		content.createChild('div', { className: 'dialogText' });
		content.appendChild(desc.wuidom);
	} else {
		content.createChild('div', { className: 'dialogText', text: desc.text });
	}
	var buttonContainer = content.createChild('div', { className: 'buttons' });
	if (desc.buttons) {
		if (desc.buttons.length > 1 && !desc.onClose) { console.warn('Notification needs an onClose function'); }
		for (var i = 0; i < desc.buttons.length; i++) {
			var button = buttonContainer.appendChild(new Button({ className: 'button',
				text: desc.buttons[i].label }, buttonAction));
			button.index = i;
		}
	}

	var dialog = window.gui.gameGuiContainer.createChild('div', { className: 'NotificationDialog' });
	dialog.appendChild(content);
	this.dialogs[notifId] = dialog;
};

/** Creates a new notification into the notification bar */
NotificationBar.prototype._createNotification = function (notifId, desc) {
	var self = this;

	var notifBtn = this.container.createChild('div', { className: 'notificationButton', name: notifId });
	var icon = notifBtn.appendChild(new Button({ className: ['icon', 'spinner'], name: 'icon' }, function () {
		self._notificationButtonAction(this.notifId);
	}));
	icon.notifId = notifId;

	var iconId = '';
	var iconColor = '';

	if (!isNaN(desc.type)) {
		var imageInfo = notificationImageInfo[desc.type] || {};
		iconId = imageInfo.icon || iconId;
		iconColor = imageInfo.color || iconColor;
	}

	// desc.iconId and desc.iconColor will replaced predefined icon of desc.type
	iconId = desc.iconId || iconId;
	iconColor = desc.iconColor || iconColor;

	var imageList = [
		'gfx/notifications/' + (iconId || DEFAULT_ICON) + '.png',
		'gfx/notifications/' + (iconColor || DEFAULT_COLOR) + '.png'
	];

	assetPreloading.preloadImages(imageList, function (urls) {
		if (icon && icon.rootElement) {
			icon.setStyle('backgroundImage', urls[0] + ', ' + urls[1]);
			icon.delClassNames('spinner');

			if (desc.timer) {
				// show a gauge (NB: Flash client does not) and autoclose on timeout
				var delayInMs = parseInt(desc.timer, 10);
				var timerGauge = notifBtn.createChild('div', { className: 'timer' });
				var tweenReturnedObj = tweener.tween(timerGauge,
					{ height: '100%' },
					{
						time: delayInMs,
						easing: 'linear'
					},
					function () {
						self.removeNotification(notifId);
					}
				);
				icon.cancelTween = tweenReturnedObj.cancel;
			}
		}
	});
};

/** Shows a notification's dialog - public method
 *  @param {string} id - same notifId as given to method newNotification. Does nothing if invalid/already closed
 *  @param {boolean} showLast - open the dialog of the last notification
 */
NotificationBar.prototype.showDialog = function (id, showLast) {
	this.hideDialog(this.currentOpenedId);
	this.currentOpenedId = id;

	var notifBtn = this.container.getChild(id);
	notifBtn.addClassNames('opened');

	if (showLast) {
		notifBtn.rootElement.scrollIntoView(false);
	}
	this._repositionDialog(id);
	playUiSound('NEW_TIPS');
};

/** Hides a notification's dialog - public method
 *  @param {string} id - same notifId as given to method newNotification. Does nothing if invalid/already closed */
NotificationBar.prototype.hideDialog = function (id) {
	if (!id || id !== this.currentOpenedId) { return; }

	var notifBtn = this.container.getChild(id);
	notifBtn.delClassNames('opened');

	this.currentOpenedId = null;
	this.dialogs[id].hide();
};

/** Removes a notification - public method
 *  @param {string} id - same notifId as given to method newNotification. Does nothing if invalid/already closed */
NotificationBar.prototype.removeNotification = function (id) {
	var dialog = this.dialogs[id];
	if (!dialog) { return; }

	var self = this;
	// destroying right now breaks on Button "tapend"; we let WuiDom finish first
	window.setTimeout(function () {
		self._destroyNotification(id);
	}, 0);
};

/** Helper to create a text notification with given text (or content as a WuiDom) and buttons.
 *  Callers can define 1 or several functions to be called when the buttons are tapped
 *  (or when the "cross" button is used to close the notification). The action functions are passed
 *  the index of the button (in desc.buttons), or -1 for the "onClose" function.
 *  e.g. {
		title: 'New friend's request',
		text: 'Paul wants to be your friend',
		buttons: [
			{ label: 'Sure', action: acceptOrRefuse },
			{ label: 'No way', action: acceptOrRefuse }
		],
		onClose: acceptOrRefuse
	}
 *  Notes:
 *  - if 2 buttons or more are given, then "onClose" function must be given too.
 *  - if timer (in ms) is given, the notification is simply closed on timeout (onClose is not called)
 *  - your button action function can return special values: (only 1 for now)
 *    - 'HIDE_DIALOG': notification will not be closed: only the dialog part will be hidden
 *    - if your function returns any other value (or nothing) the notification will be closed automatically
 *  - Predefined icon will be shown if type is defined
 *  - Defining iconId and iconColor when type is defined will replaced the predefined icon
 *  - Will display default icon (blue question mark) if type, iconId, and iconColor are not defined
 *
 *  @param {string}   notifId             - a unique string that will allow you to identify the new notification
 *  @param {Object}   desc                - all the parameters for the notification
 *         {string}   desc.title          - if the content is simple text, can replace desc.wuidom
 *         {number}   desc.type           - predefined notification type (see notificationType in enums.js)
 *         {number}   [desc.iconId]       - notification icon id (default = question mark)
 *         {string}   [desc.iconColor]    - notification icon color (default = blue)
 *         {array}    [desc.buttons]      - buttons, if any; see example above
 *         {function} [desc.onClose]      - if provided, called when user taps on the close button
 *         {number}   [desc.timer]        - positive number to indicate the timer (in ms)
 *         {WuiDom}   desc.wuidom         - a WuiDom element which contain the body for the notification content
 *         {string}   desc.text           - if the content is simple text, can replace desc.wuidom
 */
NotificationBar.prototype.newNotification = function (notifId, desc) {
	this._createNotification(notifId, desc);
	this._updateCounter();
	this._createDialog(notifId, desc);
	this.showDialog(notifId, true); // show the dialog of the last notification
};

NotificationBar.prototype.isNotificationOpen = function (notifId) {
	return !!this.dialogs[notifId];
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/NotificationBar/index.js
 ** module id = 501
 ** module chunks = 0
 **/