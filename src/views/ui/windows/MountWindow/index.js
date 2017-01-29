require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var MountDetails = require('MountDetails');
var windowsManager = require('windowsManager');

var EFFECT_ID_MOUNT = 995;

/**
 * @class MountWindow
 * @desc  Window for mount
 * @this Window
 * @extends {Window}
 */
function MountWindow() {
	Window.call(this, {
		title: '',
		className: 'MountWindow',
		positionInfo: { right: 30, top: 'c', width: 280, height: 525 }
	});
	var self = this;

	var content = this.windowBody;
	var playerData = window.gui.playerData;
	var connectionManager = window.dofus.connectionManager;

	var mountDetails = content.appendChild(new MountDetails());

	function displayMount(mountData, context) {
		mountDetails.setMount(mountData, { context: context || 'equipped' });
		self.windowTitle.setText(mountDetails.getName());
	}

	connectionManager.on('ExchangeStartOkMountMessage', function () {
		windowsManager.close(self.id);
	});

	mountDetails.on('freeMount', function () {
		windowsManager.close(self.id);
	});

	mountDetails.on('renameMount', function (name) {
		self.windowTitle.setText(name);
	});

	playerData.on('setMount', this.localizeEvent(function (msg) {
		displayMount(msg.mountData);
	}));

	// Got mount data (sent by server in various cases)
	connectionManager.on('MountDataMessage', this.localizeEvent(function (msg) {
		if (!self.isMountInfoExpected) { return; } // data is for Breeding window
		self.isMountInfoExpected = false;

		// We open the mount details in "read-only" mode (e.g. one cannot modify a certificate in inventory)
		var mountData = msg.mountData;
		mountData.mountLocation = 'certificate';
		displayMount(mountData, 'inventory');

		content.delClassNames('spinner');
		mountDetails.show();
	}));

	this.on('open', function (params) {
		params = params || {};

		if (this.isMountInfoExpected) {
			mountDetails.hide();
			content.addClassNames('spinner');
			return;
		}

		var mountData = params.mountData || playerData.equippedMount;
		displayMount(mountData);
	});

	this.on('close', function () {
		windowsManager.close('feed');
	});
}
inherits(MountWindow, Window);
module.exports = MountWindow;


MountWindow.prototype.showPaddockMount = function (actorId) {
	this.isMountInfoExpected = true;
	windowsManager.open(this.id);

	window.dofus.sendMessage('MountInformationInPaddockRequestMessage', { mapRideId: actorId });
	// => we will receive a MountDataMessage in response
};

MountWindow.prototype.showCertificateMount = function (item) {
	var mountEffect = item.effectsMap[EFFECT_ID_MOUNT]; // only certificates have this
	if (!mountEffect) { return; }

	this.isMountInfoExpected = true;
	windowsManager.open(this.id);

	window.dofus.sendMessage('MountInformationRequestMessage', { id: mountEffect.mountId, time: mountEffect.date });
	// => we will receive a MountDataMessage in response
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/MountWindow/index.js
 ** module id = 892
 ** module chunks = 0
 **/