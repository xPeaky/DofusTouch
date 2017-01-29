require('./equipBox.less');
var assetPreloading = require('assetPreloading');
var DraggedMount = require('./DraggedMount');
var getText = require('getText').getText;
var Placeholder = require('Placeholder');
var tapBehavior = require('tapBehavior');


function EquipBox(parent, room, tapHandler) {
	this.mountData = null;

	this.box = parent.createChild('div', { className: 'equipBox' });

	this._createTile(room, tapHandler);

	this.placeholder = new Placeholder(this.box);
	this.placeholder.setText(getText('tablet.mount.noEquipped'));
}
module.exports = EquipBox;


EquipBox.prototype._createTile = function (room, tapHandler) {
	var tile = this.tile = this.box.createChild('div', { className: ['mount', 'neutralTile'] });
	room.getTile = function (tileId) { return tile.id === tileId ? tile : null; };

	tile.createChild('div', { className: 'title', text: getText('tablet.mount.equipped') });
	this.mountImg = tile.createChild('div', { className: 'mountImg' });

	var nameAndLevel = tile.createChild('div', { className: 'nameAndLevel' });
	this.mountName = nameAndLevel.createChild('div', { className: 'mountName' });
	this.mountLevel = nameAndLevel.createChild('div', { className: 'level' });

	tapBehavior(tile);
	tile.on('tap', tapHandler);
	tile.setTileSelected = this._setTileSelected.bind(this);
	tile.refreshDisplay = this._refreshTile.bind(this);
	tile.highlightTile = function () {}; // for equipBox, select is same as highlight

	tile.id = null;
	tile.mountData = null;
	tile.selected = false;
	tile.room = room;
	tile.equipBox = this;

	this.dragInfo = new DraggedMount(room.breedingWindow, tile);
};

EquipBox.prototype.updateMount = function (mountData) {
	var prevMountData = this.mountData;

	var hasMount = !!mountData;
	this.tile.toggleDisplay(hasMount);
	this.placeholder.toggleDisplay(!hasMount);

	if (!mountData) {
		this.mountData = null;
		this.tile.addClassNames('neutralTile');
		this.tile.delClassNames('focusedTile');
	} else {
		this.mountData = mountData;
		this._refreshTile();
		this.dragInfo.setMount(mountData, this.mountImg);
	}
	return prevMountData;
};

// Method called on room's tile
EquipBox.prototype._setTileSelected = function (shouldSelect) {
	shouldSelect = shouldSelect !== undefined ? shouldSelect : true;
	this.tile.toggleClassName('focusedTile', shouldSelect);
	this.tile.toggleClassName('neutralTile', !shouldSelect);
	this.tile.selected = shouldSelect;
};

// Method called on room's tile
EquipBox.prototype._refreshTile = function () {
	var mountData = this.mountData;

	this.tile.mountData = mountData;
	this.tile.id = mountData.id;

	this.mountName.setText(mountData.name || getText('ui.common.noName'));
	this.mountLevel.setText(getText('ui.common.short.level') + ' ' + mountData.level);

	var self = this;
	assetPreloading.preloadImage('gfx/mounts/' + mountData.model + '.png', function (url) {
		self.mountImg.setStyle('backgroundImage', url);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/BreedingWindow/EquipBox.js
 ** module id = 655
 ** module chunks = 0
 **/