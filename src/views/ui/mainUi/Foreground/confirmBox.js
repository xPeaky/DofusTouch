var Button                          = require('Button');
var Foreground                      = require('./main.js');
var getText                         = require('getText').getText;
var getElementPositionCenteredAt    = require('positionHelper').getElementPositionCenteredAt;
var tapPosition                     = require('tapHelper').position;
var tweener                         = require('tweener');

Foreground.prototype._createConfirmBox = function () {
	var onConfirm,
		position = { x: 0, y: 0 };

	var confirmBox = this.confirmBox =
		window.gui.gameGuiContainer.createChild('div', { className: 'fightConfirmBox', hidden: true });
	confirmBox.isOpen = true;
	confirmBox.allowDomEvents();

	var title = confirmBox.createChild('div', { className: 'title' });
	var content = confirmBox.createChild('div', { className: 'content' });
	content.appendChild(new Button({ className: 'cancel', scaleOnPress: true }, function () {
		onConfirm(false);
		confirmBox.close();
	}));
	var mpAndAp = content.createChild('div', { className: 'mpAndAp' });
	var mp = mpAndAp.createChild('div', { className: 'mp' });
	mp.createChild('div', { className: 'logo' });
	var mpValue = mp.createChild('div', { className: 'value' });
	var ap = mpAndAp.createChild('div', { className: 'ap' });
	ap.createChild('div', { className: 'logo' });
	var apValue = ap.createChild('div', { className: 'value' });
	var valid = content.appendChild(new Button({ className: 'valid', scaleOnPress: true }, function () {
		valid.disable();
		onConfirm(true);
		confirmBox.close();
	}));
	var currentActionId = null;

	confirmBox.open = function (mode, value, onConfirmCallback, actionId, startHidden) {
		if (currentActionId && actionId && currentActionId === actionId) {
			onConfirmCallback(true);
			confirmBox.close();
			return;
		}

		currentActionId = actionId;

		valid.enable();

		if (mode === 'move') {
			title.setText(getText('ui.common.move'));
			mp.show();
			mpValue.setText(getText('ui.short.movementPoints') + getText('ui.common.colon') + '-' + value.mp);
			if (value.ap > 0) {
				apValue.setText(getText('ui.short.actionPoints') + getText('ui.common.colon') + '-' + value.ap);
				ap.show();
			} else {
				ap.hide();
			}
		} else {
			title.setText(value.name);

			mp.hide();
			ap.show();
			apValue.setText(getText('ui.short.actionPoints') + getText('ui.common.colon') + '-' + value.apCost);
		}
		confirmBox.show();

		position = getElementPositionCenteredAt(confirmBox, tapPosition.x, tapPosition.y);
		if (!confirmBox.isOpen) {
			confirmBox.setStyles({
				webkitTransform: 'scale(0) translate3d(' + position.x + 'px,' + position.y + 'px,0)',
				webkitTransformOrigin: tapPosition.x + 'px ' + tapPosition.y + 'px'
			});
		} else {
			confirmBox.setStyles({
				webkitTransformOrigin: tapPosition.x + 'px ' + tapPosition.y + 'px'
			});
		}
		tweener.tween(
			confirmBox,
			{ webkitTransform: 'scale(1) translate3d(' + position.x + 'px,' + position.y + 'px,0)' },
			{ time: 100, easing: 'linear' }
		);

		confirmBox.isOpen = true;
		if (startHidden) {
			confirmBox.hide();
		}
		onConfirm = onConfirmCallback;
	};

	function hide() {
		confirmBox.hide();
		confirmBox.tween = null;
	}

	confirmBox.close = function () {
		if (!confirmBox.isOpen) { return; }
		confirmBox.isOpen = false;
		valid.disable();
		currentActionId = null;
		tweener.tween(
			confirmBox,
			{ webkitTransform: 'scale(0) translate3d(' + position.x + 'px,' + position.y + 'px,0)' },
			{ time: 100, easing: 'linear' },
			hide
		);
	};

	confirmBox.close();
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Foreground/confirmBox.js
 ** module id = 214
 ** module chunks = 0
 **/