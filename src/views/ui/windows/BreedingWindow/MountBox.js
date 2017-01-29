require('./mountBox.less');
var assetPreloading = require('assetPreloading');
var DraggedMount = require('./DraggedMount');
var GaugeIcon = require('MountDetails/GaugeIcon');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var MountDetails = require('MountDetails');
var SerenityGauge = require('MountDetails/SerenityGauge');
var StatusIcon = require('MountDetails/StatusIcon');
var tapBehavior = require('tapBehavior');
var tooltip = require('TooltipBox');
var WuiDom = require('wuidom');

var ICON_GAUGE_SIZE = 27; // px

var EXPIRING_SOON = 4; // in days; if < to this number we show a different color (e.g. orange)
var EXPIRING_VERY_SOON = 2; // in days; if < to this number we show a different color (e.g. red)

// detailLevel values
var DETAIL_NONE = 0, DETAIL_PARTIAL = 1, DETAIL_FULL = 2;

var tilePool = {};
tilePool.shed = [];
tilePool.paddock = [];
tilePool.certificate = [];

var imgUrlCache = {};


/**
 * Element to display mount's information
 * @param {object} mountData
 * @param {Room} room
 * @constructor
 */
function MountBox(mountData, room) {
	var id = mountData.id;

	WuiDom.call(this, 'div', { className: 'mountBox', name: id, hidden: true });
	if (room.id === 'certificate') { this.addClassNames('certificate'); }

	this.id = id;
	this.room = room;
	this.mountData = mountData;
	this.selected = false;
	this.renderingFg = null; // "foreground" WuiDom, used for "rendering"
	this.detailLevel = DETAIL_NONE;
}
inherits(MountBox, WuiDom);
module.exports = MountBox;


// Called when all rooms are freeing their content
MountBox.freeContent = function () {
	tilePool.shed = [];
	tilePool.paddock = [];
	tilePool.certificate = [];
};

MountBox.prototype.setSpinnerVisible = function (shouldShow) {
	if (!this.renderingFg) { return; }
	this.renderingFg.toggleClassName('spinner', !!shouldShow);
};

function tileTapHandler() {
	// "this" is the foreground of the tile
	var mountBox = this.mountBox;
	mountBox.room.breedingWindow.tileTapHandler(mountBox);
}

function certifTapHandler() {
	// "this" is the certificate icon
	return tileTapHandler.call(this.foreground);
}

function certifLongTapHandler() {
	// "this" is the certificate icon
	this.cancelTap(); // TODO: fix tapBavior so 'tap' is not sent if 'longtap' is handled
	var mountInfo = this.foreground.mountBox.mountData.certificate.mountInfo;
	var msg = mountInfo.ownerDesc + '\n' + mountInfo.validityDesc;
	tooltip.showNotification(msg, this);
}

function createTileContent(room) {
	var isCertif = room.id === 'certificate';
	var classNames = isCertif ? ['fg', 'certificate'] : 'fg';

	var fg = new WuiDom('div', { className: classNames, hidden: true });
	fg.mountBox = null; // used for all events on a tile's foreground (finds back MountBox)

	tapBehavior(fg, { doubletapTimeout: 1 });
	fg.on('tap', tileTapHandler);

	fg.dragInfo = new DraggedMount(room.breedingWindow, fg);

	fg._mountName = fg.createChild('div', { className: 'mountName' });

	fg._mountImg = fg.createChild('div', { className: 'mountImg' });

	if (isCertif) {
		fg._certifValidity = fg.createChild('div', { className: 'certifValidity' });

		var certifImg = fg.createChild('div', { className: 'certifImg' });
		tapBehavior(certifImg, { doubletapTimeout: 1 });
		certifImg.foreground = fg;
		certifImg.on('tap', certifTapHandler);
		certifImg.on('longtap', certifLongTapHandler);
	} else {
		fg._level = fg.createChild('div', { className: 'level' });

		fg._fertileIcon = fg.appendChild(new StatusIcon('fertile'));

		// Gauge div

		var gaugeDiv = fg.gaugeDiv = fg.createChild('div', { className: ['gaugeDiv', 'partial'] });
		var iconGaugeBar = gaugeDiv.createChild('div', { className: 'iconGaugeBar' });

		fg._staminaGauge = iconGaugeBar.appendChild(new GaugeIcon('stamina', null,
			{ size: ICON_GAUGE_SIZE, withoutLabel: true }));
		fg._maturityGauge = iconGaugeBar.appendChild(new GaugeIcon('maturity', null,
			{ size: ICON_GAUGE_SIZE, withoutLabel: true }));
		fg._loveGauge = iconGaugeBar.appendChild(new GaugeIcon('love', null,
			{ size: ICON_GAUGE_SIZE, withoutLabel: true }));

		fg._serenityGauge = gaugeDiv.appendChild(new SerenityGauge(/*isMini=*/true));
		fg._serenityGauge.resize();
	}
	return fg;
}

MountBox.prepareTilePool = function (room, size) {
	var pool = tilePool[room.id];
	var neededTiles = size - pool.length;

	for (var i = 0; i < neededTiles; i++) {
		var fg = room.box.appendChild(createTileContent(room));
		pool.push(fg);
	}
};

MountBox.prototype._createTile = function () {
	var room = this.room;
	var pool = tilePool[room.id];
	var fg = pool.pop();
	if (!fg) {
		fg = room.box.appendChild(createTileContent(room));
	}

	fg.mountBox = this;
	this.renderingFg = fg; // tile "rendered by" fg
};

MountBox.prototype._moveTile = function (index) {
	var fg = this.renderingFg;
	if (fg.index === index) { return; }

	// Where is the tile in the room's list?
	var room = this.room, numColumns = room.numColumns;
	var y = Math.floor(index / numColumns) * room.rowHeight;
	var x = index % numColumns * room.columnWidth;

	fg.index = index;
	fg.setStyle('webkitTransform', 'translate3d(' + x + 'px, ' + y + 'px, 0)');
};

// This function takes virtually no time - simply pushing tiles back to the pool (no CSS change)
MountBox.prototype._releaseTileContent = function () {
	var pool = tilePool[this.room.id];

	pool.push(this.renderingFg);
	this.renderingFg = null;
	this.detailLevel = DETAIL_NONE;
};

MountBox.prototype._updateTileContent = function (detailLevel) {
	var fg = this.renderingFg;
	if (!fg) { return; } // not displayed; we can ignore
	this.detailLevel = detailLevel;
	var mountData = this.mountData;

	fg._mountName.setText(mountData.name || getText('ui.common.noName'));
	fg._mountName.toggleClassName('noName', !mountData.name);

	if (!mountData.certificate) {
		fg._mountName.toggleClassName('female', !!mountData.sex);

		fg._level.setText(getText('ui.common.short.level') + ' ' + mountData.level);

		var fertilityState = MountDetails.getFertilityState(mountData);

		fg._fertileIcon.setFertileIcon(fertilityState);

		if (detailLevel === DETAIL_FULL) {
			fg.gaugeDiv.delClassNames('partial');

			fg._staminaGauge.setValue(mountData.stamina, mountData.staminaMax);
			fg._maturityGauge.setValue(mountData.maturity, mountData.maturityForAdult);
			fg._loveGauge.setValue(mountData.love, mountData.loveMax);

			fg._serenityGauge.setValue(mountData.serenity);
		} else {
			fg.gaugeDiv.addClassNames('partial');
		}
	} else {
		var receivedData = mountData.receivedData;
		fg._mountName.toggleClassName('sexUnknown', !receivedData);
		fg._mountName.toggleClassName('female', !!receivedData && receivedData.sex);

		var mountInfo = mountData.certificate.mountInfo;
		this._setValidity(fg._certifValidity,
			mountInfo.validityDays, mountInfo.validityHours, mountInfo.validityMinutes);
	}

	fg.dragInfo.setMount(mountData, fg._mountImg);

	this._retrieveMountImgUrl(fg._mountImg, mountData.model);

	fg.show(); // only needed sometimes (after creation or filtering) but super fast if already visible
};

MountBox.prototype._retrieveMountImgUrl = function (img, model) {
	var url = imgUrlCache[model];
	if (url) { return img.setStyle('backgroundImage', url); }

	assetPreloading.preloadImage('gfx/mounts/' + model + '.png', function (url) {
		img.setStyle('backgroundImage', url);
	});
};

MountBox.prototype._setValidity = function (validityElt, days, hours, minutes) {
	var text = getText('tablet.common.validity') + getText('ui.common.colon');
	if (days > 0) {
		text += days + ' ' + getText('ui.time.days', days); // e.g. "4 days"
	} else if (hours > 0) {
		text += hours + ' ' + getText('ui.time.hours', hours); // e.g. "5 hours"
	} else {
		text += minutes + ' ' + getText('ui.time.minutes', minutes); // e.g. "54 minutes"
	}

	validityElt.toggleClassName('expiringSoon', days < EXPIRING_SOON && days >= EXPIRING_VERY_SOON);
	validityElt.toggleClassName('expiringVerySoon', days < EXPIRING_VERY_SOON);
	validityElt.setText(text);
};

MountBox.prototype.refreshDisplay = function () {
	this._updateTileContent(DETAIL_FULL);
};

// NB: should work even if foreground does not exist yet
MountBox.prototype.setTileSelected = function (shouldSelect) {
	this.selected = shouldSelect;

	this.toggleClassName('selected', shouldSelect);
	this.delClassNames('focusedTile');
};

MountBox.prototype.highlightTile = function () {
	this.selected = true;
	this.addClassNames('focusedTile');
};

// Called when tile is about to move into the visible part of room
MountBox.prototype.prepareToShow = function (index, numStep) {
	// Move tile if marked for reordering
	if (this.renderingFg && this.renderingFg.index < 0) {
		this._moveTile(index);
	}

	if (numStep === 1) {
		if (this.detailLevel >= DETAIL_PARTIAL) { return false; } // already there

		this._createTile();
		this._moveTile(index);
		this._updateTileContent(DETAIL_PARTIAL);
	} else if (numStep === 2) {
		if (this.detailLevel === DETAIL_FULL) { return false; }

		this._updateTileContent(DETAIL_FULL);
	}
	return true;
};

// Called when tile is about to move out from the visible part of room
MountBox.prototype.prepareToGoOffScreen = function () {
	if (!this.renderingFg) { return; }

	this._releaseTileContent();
};

// Called when a tile must be shown as a result of filtering
MountBox.prototype.showTile = function () {
	this.show();
};

// Called when a tile must be hidden as a result of filtering or removal from room
MountBox.prototype.hideTile = function () {
	this.hide();

	if (this.renderingFg) {
		this.renderingFg.hide();
		this._releaseTileContent();
	}
};

MountBox.hidePoolTiles = function (room) {
	var pool = tilePool[room.id];
	for (var i = pool.length - 1; i >= 0; i--) {
		pool[i].hide();
	}
};

MountBox.prototype.markForReorder = function () {
	if (!this.renderingFg) { return; }

	this.renderingFg.index = -1;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/BreedingWindow/MountBox.js
 ** module id = 671
 ** module chunks = 0
 **/