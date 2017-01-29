var connectionManager = require('dofusProxy/connectionManager.js');
var getText = require('getText').getText;
var inactivityMonitor = require('inactivityMonitor');
var PlayerStatusEnum = require('PlayerStatusEnum');
var tooltip = require('TooltipBox');

var statusTextMap = {};
statusTextMap[PlayerStatusEnum.PLAYER_STATUS_AFK] = 'ui.chat.status.away';
statusTextMap[PlayerStatusEnum.PLAYER_STATUS_IDLE] = 'ui.chat.status.idle';
statusTextMap[PlayerStatusEnum.PLAYER_STATUS_PRIVATE] = 'ui.chat.status.private';
statusTextMap[PlayerStatusEnum.PLAYER_STATUS_SOLO] = 'ui.chat.status.solo';
statusTextMap[PlayerStatusEnum.PLAYER_STATUS_AVAILABLE] = 'ui.chat.status.availiable';


/**
 * @class UI component showing player's status on the Chat window.
 * NB:
 * - we do not modify our status directly, we always ask server and wait for its reply.
 * - IDLE status comes from automatic detection of inactivity, but AFK (Away From Keyboard) is set by player
 */
function StatusIndicator(parent) {
	this.currentStatus = PlayerStatusEnum.PLAYER_STATUS_AVAILABLE;

	this._createContent(parent);

	this._setListeners();
}
module.exports = StatusIndicator;


StatusIndicator.prototype.initialize = function () {
	this.currentStatus = PlayerStatusEnum.PLAYER_STATUS_AVAILABLE;
};

StatusIndicator.prototype._createContent = function (parent) {
	this.statusButton = parent.createChild('div', { className: ['statusButton', 'available'] });

	var self = this;
	tooltip.addTooltip(this.statusButton, function () {
		return getText(statusTextMap[self.currentStatus]);
	});

	this.statusButton.on('tap', function () {
		var boundingRect = this.rootElement.getBoundingClientRect();
		window.gui.openContextualMenu('userStatus', null, {
			x: boundingRect.left + boundingRect.width,
			y: boundingRect.top
		});
	});
};

function getClassNameFromStatus(statusId) {
	switch (statusId) {
	case PlayerStatusEnum.PLAYER_STATUS_AVAILABLE: return 'available';
	case PlayerStatusEnum.PLAYER_STATUS_IDLE:      return 'away';
	case PlayerStatusEnum.PLAYER_STATUS_AFK:       return 'away';
	case PlayerStatusEnum.PLAYER_STATUS_PRIVATE:   return 'private';
	case PlayerStatusEnum.PLAYER_STATUS_SOLO:      return 'solo';
	default: // cannot be PLAYER_STATUS_OFFLINE nor PLAYER_STATUS_UNKNOWN so this shoul NOT happen
		console.error('getClassNameFromStatus got invalid state', statusId);
		return 'available'; // just to avoid breaking
	}
}

StatusIndicator.prototype._setCurrentStatus = function (statusId) {
	// Store new state only if not IDLE: for IDLE we want to get back to current state once player is active
	if (statusId !== PlayerStatusEnum.PLAYER_STATUS_IDLE) { this.currentStatus = statusId; }

	this.statusButton.replaceClassNames(
		['available', 'away', 'private', 'solo'],
		[getClassNameFromStatus(statusId)]
	);
};

StatusIndicator.prototype._setListeners = function () {
	var self = this;

	/** @event module:protocol/characterStatus.client_PlayerStatusUpdateMessage */
	connectionManager.on('PlayerStatusUpdateMessage', function (msg) {
		// Ignore status of other players
		if (msg.playerId !== window.gui.playerData.characterBaseInformations.id) { return; }

		self._setCurrentStatus(msg.status.statusId);
	});

	inactivityMonitor.on('inactive', function (isInactive) {
		var statusId = isInactive ? PlayerStatusEnum.PLAYER_STATUS_IDLE : self.currentStatus;
		// Send new status request to server; note that this is seen as "activity" by the server,
		// so when inactive the server's timeout to kick us out starts from now.
		window.dofus.sendMessage('PlayerStatusUpdateRequestMessage', {
			status: { statusId: statusId }
		});
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Chat/StatusIndicator.js
 ** module id = 452
 ** module chunks = 0
 **/