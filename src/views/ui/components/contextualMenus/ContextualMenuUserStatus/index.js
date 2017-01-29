require('./styles.less');
var ContextualMenu = require('contextualMenus/ContextualMenu');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var PlayerStatusEnum = require('PlayerStatusEnum');
var tapBehavior = require('tapBehavior');

function createStatusButton(label, className, statusId, menu) {
	var button = new WuiDom('li', { className: className, text: label });
	tapBehavior(button);

	button.on('tap', function () {
		window.dofus.sendMessage('PlayerStatusUpdateRequestMessage', {
			status: {
				statusId: statusId
			}
		});
		menu.hide();
	});

	return button;
}

function ContextualMenuUserStatus() {
	ContextualMenu.call(this, { className: 'ContextualMenuUserStatus' });

	this.once('open', function () {
		this.header.setText(getText('ui.chat.status.title'));

		var statusList = [
			{
				label: getText('ui.chat.status.availiable'),
				className: 'available',
				id: PlayerStatusEnum.PLAYER_STATUS_AVAILABLE
			},
			{
				label: getText('ui.chat.status.away'),
				className: 'away',
				id: PlayerStatusEnum.PLAYER_STATUS_AFK
			},
			{
				label: getText('ui.chat.status.private'),
				className: 'private',
				id: PlayerStatusEnum.PLAYER_STATUS_PRIVATE
			},
			{
				label: getText('ui.chat.status.solo'),
				className: 'solo',
				id: PlayerStatusEnum.PLAYER_STATUS_SOLO
			}
		];

		var list = this.entryList.createChild('ul');
		for (var i = 0, len = statusList.length; i < len; i += 1) {
			var status = statusList[i];

			list.appendChild(createStatusButton(status.label, status.className, status.id, this));
		}

		this._addCancel();
	});

	this.on('open', function (params, contentReady) {
		contentReady();
	});
}

inherits(ContextualMenuUserStatus, ContextualMenu);
module.exports = ContextualMenuUserStatus;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuUserStatus/index.js
 ** module id = 429
 ** module chunks = 0
 **/