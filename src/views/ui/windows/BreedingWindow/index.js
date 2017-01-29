require('./styles.less');
var Button = require('Button');
var CheckboxLabel = require('CheckboxLabel');
var DraggedMount = require('./DraggedMount');
var dragManager = require('dragManager');
var EquipBox = require('./EquipBox');
var ExchangeErrorEnum = require('ExchangeErrorEnum');
var exchangeHandleEnum = require('ExchangeHandleMountEnum');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var isEmptyObject = require('helper/JSUtils').isEmptyObject;
var MountDetails = require('MountDetails');
var MountBox = require('./MountBox');
var MountFilterBox = require('MountFilterBox');
var Placeholder = require('Placeholder');
var Room = require('./Room.js');
var Selector = require('Selector');
var Tabs = require('Tabs');
var TooltipBox = require('TooltipBox');
var WaitingGauge = require('./WaitingGauge');
var Window = require('Window');
var windowsManager = require('windowsManager');
var WuiDom = require('wuidom');

var DRAG_MOUNT_ID = DraggedMount.DRAG_ID;

var CERTIF_ID_PREFIX = 'c';

var SHED_SIZE = 150;
var EQUIP_SIZE = 1;
var DROP_TIMEOUT = 200; // ms

var FIRST_OPENED_TAB = 'paddock';

// Code of effects inside a certificate itemInstance's effects
var EFFECT_INVALID = 994, EFFECT_MOUNT = 995, EFFECT_OWNER = 996, EFFECT_NAME = 997, EFFECT_VALIDITY = 998;

// Properties included in a certificate - for other properties we need to get mount's data from server
var isCertifBaseProperty = {
	id: true,
	name: true,
	model: true
};

var NUM_STEPS_FOR_MOVE = 2; // moving a mount is 2 steps: remove + add

var CERTIF_BULK_LOAD = true; // TODO: verify with Bill/server code that certifs are received in order

var NEWBORN_PURGE_DELAY = 10 * 60000; // ms; when window closes, babies older than this stop being flagged


function BreedingWindow() {
	Window.call(this, {
		className: 'BreedingWindow',
		positionInfo: { left: '0', bottom: '0', width: '100%', height: '100%' }, // TODO: isFullScreen: true
		noTitle: true
	});

	this.mountDataFromCertifId = {}; // certif ID => mountData
	this.babyMap = {}; // mount ID or certif ID => time of birth in ms

	this._reset();
	this._setupEvents();
}

inherits(BreedingWindow, Window);
module.exports = BreedingWindow;


BreedingWindow.prototype._reset = function () {
	this.isWindowSizeFull = false;
	this.isMultiselect = false;
	this.selectionRoom = null;
	this.focusedTile = null;
	this.openedRoom = null;
	this.dropZones = {}; // room id: dropzone
	this.certificateQueue = [];
	this.certificateTilePendingSelection = null; // once certificate's data is received we select this tile
	this.nonLoadedCertifCount = 0;
	this.waitingGaugeGoal = 0;
	this.certifAreRequested = false;
	this.numMassRemove = 0;
	this.numMassAdd = 0;
	this.isFilterEmpty = true;

	this._purgeNewbornList();
};

BreedingWindow.prototype.freeContent = function () {
	this.windowBody.clearContent();
	this.equipBox = null;
	this.focusedMountDetails = null;

	this.rooms = null;
	this.roomBoxes = null;
	this.roomTabs = null;
	this.displayedRooms = null;
	this.roomDropZones = null;

	this.mountFilterBox = null;
	this.statusBar = null;
	this.allNoneCheckbox = null;
	this.waitingGauge = null;
};

BreedingWindow.prototype._resetDom = function () {
	for (var id in this.rooms) {
		this.rooms[id].reset();
	}

	this._hideMountDetails();
	this.equipBox.updateMount(null);

	this._setFilterBoxVisible(false);
	if (this.mountFilterBox) { this.mountFilterBox.resetFilters(); }

	this.allNoneCheckbox.toggleActivation(false, /*isSilent=*/true);
	this.waitingGauge.hideGauge();

	MountBox.freeContent();
};

BreedingWindow.prototype._createDom = function () {
	this._createRooms();

	var leftCol = this.windowBody.createChild('div', { className: 'leftCol' });
	this._setupMountDetails(leftCol);
	this._setupEquipBox(leftCol);
	this._hideMountDetails();

	var rightCol = this.windowBody.createChild('div', { className: 'rightCol' });
	this._setupFilterMenuBox(rightCol);

	this.rooms.paddock.capacity = this.paddockCapacity;
	this._setupRoomBoxes(rightCol);

	this.waitingGauge = this.windowBody.appendChild(new WaitingGauge());

	this._setupMountFilterBox(rightCol);

	this._setupDropZones();
};

BreedingWindow.prototype._setupEvents = function () {
	var self = this;
	var gui = window.gui;
	var connectionManager = window.dofus.connectionManager;
	var playerData = gui.playerData;
	var inventory = playerData.inventory;

	gui.on('disconnect', function () {
		self.mountDataFromCertifId = {}; // certif IDs are only valid during 1 session
	});

	this.on('close', function () {
		this._resetDom();
		this._reset();

		// remove the lock put on the mount window and buttons to access it
		gui.uiLocker.unlockFeature('mount', 'breedingOpened');
	});

	this.on('opened', function () {
		this.isWindowSizeFull = true;
	});

	function openErrorPopup(error) {
		self.waitingGauge.hideGauge();
		if (error !== ExchangeErrorEnum.MOUNT_PADDOCK_ERROR) {
			return;
		}
		// NOTE: only exchange error related to mounts
		var mountErrStr = getText('ui.exchange.cantExchangeMountPaddockError');
		window.gui.openSimplePopup(mountErrStr);
	}

	// player has accessed a paddock area (also opens window)
	connectionManager.on('ExchangeStartOkMountMessage', function (msg) {
		self._initDisplay(msg);
	});
	// TODO? ExchangeStartOkMountWithOutPaddockMessage

	playerData.on('setMount', this.localizeEvent(function () {
		self._updateEquipBox();
		self.waitingGauge.hideGauge();
	}));

	playerData.on('unsetMount', this.localizeEvent(function () {
		if (self.numMassRemove) { self.numMassRemove--; } // moved equipped mount to a room
		self._updateEquipBox();
	}));

	// A newborn appeared in the shed
	gui.on('ExchangeMountStableBornAddMessage', function (msg) {
		var mountData = msg.mountDescription;
		self.babyMap[mountData.id] = Date.now();
		if (!self.equipBox) { return; } // when using admin command "ridebirth", breeding window might be closed

		self._addMountsToRoom(self.rooms.shed, mountData);
	});

	// added to shed
	gui.on('ExchangeMountStableAddMessage', this.localizeEvent(function (msg) {
		self._addMountsToRoom(self.rooms.shed, msg.mountDescription);
	}));

	// removed from shed
	gui.on('ExchangeMountStableRemoveMessage', this.localizeEvent(function (msg) {
		self._removeMountsFromRoom(self.rooms.shed, msg.mountId);
	}));

	// added to paddock
	gui.on('ExchangeMountPaddockAddMessage', this.localizeEvent(function (msg) {
		self._addMountsToRoom(self.rooms.paddock, msg.mountDescription);
	}));

	// removed from paddock
	gui.on('ExchangeMountPaddockRemoveMessage', this.localizeEvent(function (msg) {
		self._removeMountsFromRoom(self.rooms.paddock, msg.mountId);
	}));

	// current paddock properties
	gui.on('PaddockPropertiesMessage', this._updatePaddockProperties.bind(this));

	// added mount to certificates via new item instance in inventory
	inventory.on('itemAdded', this.localizeEvent(function (itemInstance) {
		self._addCertificates([itemInstance]);
	}));
	inventory.on('itemsAdded', this.localizeEvent(function (itemInstances) {
		self._addCertificates(itemInstances);
	}));

	// deleted certificates from inventory
	inventory.on('itemDeleted', this.localizeEvent(function (objectUID, itemInstance) {
		self._removeCertificates([itemInstance]);
	}));
	inventory.on('itemsDeleted', this.localizeEvent(function (objectUIDs, itemInstances) {
		self._removeCertificates(itemInstances);
	}));

	// got mount data from certificate or updated data after feeding etc.
	connectionManager.on('MountDataMessage', this.localizeEvent(function (msg) {
		self._receiveMountData(msg.mountData);
	}));

	connectionManager.on('MountRenamedMessage', this.localizeEvent(function (msg) {
		var tile = self._findTileInRooms(msg.mountId);
		tile.mountData.name = msg.name;
		self._refreshTile(tile);
	}));

	connectionManager.on('MountSterilizedMessage', this.localizeEvent(function (msg) {
		var tile = self._findTileInRooms(msg.mountId);
		tile.mountData.reproductionCount = -1;
		self._refreshTile(tile);
	}));

	// error getting requested mount data
	/* connectionManager.on('MountDataErrorMessage', function (msg) {
		// NOTE: In protocol but as yet unhandled by Ankama
	});*/

	// if error close mount details
	gui.on('ExchangeMountStableErrorMessage', function () {
		// NOTE: protool states message always precededed by another message with text error, unhandled by Ankama
		openErrorPopup(ExchangeErrorEnum.MOUNT_PADDOCK_ERROR); // NOTE: no error enum provided, manually pass
	});

	connectionManager.on('ExchangeErrorMessage', this.localizeEvent(function (msg) {
		openErrorPopup(msg.errorType);
	}));

	dragManager.on('dragStart', this.localizeEvent(function (sourceElement, sourceId, sourceData) {
		if (sourceId !== DRAG_MOUNT_ID) { return; }

		self._startDragging(sourceElement, sourceData);
	}));
	dragManager.on('dragEnd', this.localizeEvent(function (sourceElement, sourceId) {
		if (sourceId !== DRAG_MOUNT_ID) { return; }

		self._endDragging(sourceElement);
	}));
};

BreedingWindow.prototype._initDisplay = function (msg) {
	var inventory = window.gui.playerData.inventory;

	// disable the mount window and buttons to access it
	window.gui.uiLocker.lockFeature('mount', 'breedingOpened');

	windowsManager.openDialog(this.id);

	if (!this.equipBox) {
		this._createDom();
	} else {
		this._resetDom();
	}

	this._updateEquipBox(/*isInit=*/true);

	this.roomBoxes.hide();
	this._addMountsToRoom(this.rooms.shed, msg.stabledMountsDescription);
	this._addMountsToRoom(this.rooms.paddock, msg.paddockedMountsDescription);
	this._addCertificates(Object.keys(inventory.objects));
	this.roomBoxes.show();

	this.roomTabs.openTab(FIRST_OPENED_TAB, null, { forceOpen: true });

	this.waitingGauge.hideGauge();
};

BreedingWindow.prototype._createRooms = function () {
	var roomInfos = [
		{ id: 'paddock', name: getText('ui.common.mountPark') },
		{ id: 'shed', name: getText('ui.mount.barn'), capacity: SHED_SIZE },
		{ id: 'certificate', name: getText('ui.mount.certificates') },
		{ id: 'equip', name: getText('ui.common.equip'), capacity: EQUIP_SIZE, hidden: true }
	]; // NOTE: equip is just an invisible room with one invisible tile

	this.rooms = {}; // room id: room
	this.displayedRooms = {}; // room id: room

	for (var i = 0; i < roomInfos.length; i += 1) {
		var roomInfo = roomInfos[i];
		var roomId = roomInfo.id;
		var room = this.rooms[roomId] = new Room(this, roomId, roomInfo.name, roomInfo.capacity);

		if (!roomInfo.hidden) { this.displayedRooms[roomId] = room; }
	}
	this.numTabs = Object.keys(this.displayedRooms).length;
};

BreedingWindow.prototype._updatePaddockProperties = function (msg) {
	this.paddockCapacity = msg.properties.maxOutdoorMount;
	if (this.openState) {
		this._updateRoomTab(this.rooms.paddock);
	}
};

BreedingWindow.prototype._setupMountDetails = function (parent) {
	var mountDetailsBox = parent.createChild('div', { className: 'mountDetailsBox' });

	var mountDetails = this.focusedMountDetails = mountDetailsBox.appendChild(new MountDetails());

	// get image for drag'n drop + create DOM before setting Placeholder
	var img = mountDetails.getIllustrationElement();

	mountDetails.placeholder = new Placeholder(mountDetailsBox);

	mountDetails.dragInfo = new DraggedMount(this, img);
};

function equipBoxTapHandler() {
	// "this" is the equipBox tile
	var breedingWindow = this.room.breedingWindow;
	breedingWindow._selectTile(this.room, this);
}

BreedingWindow.prototype._setupEquipBox = function (parent) {
	this.equipBox = new EquipBox(parent, this.rooms.equip, equipBoxTapHandler);
};

BreedingWindow.prototype._selectTab = function (tabId) {
	this.openedRoom = this.rooms[tabId];
	this._updateDisplayedRoom();

	// Show multiselect as activated only if we are in the current selection room
	var showMultiselect = this.isMultiselect && this.openedRoom === this.selectionRoom;
	this.allNoneCheckbox.toggleActivation(showMultiselect, /*isSilent=*/true);
};

BreedingWindow.prototype._setupRoomBoxes = function (parent) {
	var roomBoxes = this.roomBoxes = parent.createChild('div', { className: 'roomBoxes' });
	var roomBoxWrapper = roomBoxes.createChild('div', { className: 'roomBoxWrapper' });
	var tileSpace = roomBoxWrapper.createChild('div', { className: 'tileSpace' });
	this.roomPlaceholder = new Placeholder(tileSpace);
	var tabs = this.roomTabs = roomBoxes.appendChild(new Tabs({ className: 'roomTabs' }));
	var tabHeight = roomBoxWrapper.rootElement.clientHeight / this.numTabs;
	var tabTop = 0;

	tabs.on('openTab', this._selectTab.bind(this));

	for (var id in this.rooms) {
		if (!this.displayedRooms[id]) { continue; } // no room tab for hidden rooms such as equip

		var room = this.rooms[id];
		var roomContainer = room.createBox(tileSpace);

		tabs.addTab(room.name, roomContainer, id);
		var tabDom = tabs.getTabsMap()[id].tab;
		tabDom.setStyles({ width: tabHeight + 'px', top: tabTop + 'px' });
		tabTop += tabHeight;
		tabDom.title = tabDom.createChild('div', { className: 'title', text: room.name });
		tabDom.statusLabel = tabDom.createChild('div', { className: 'statusLabel' });

		this._updateRoomTab(room);
	}
};

BreedingWindow.prototype._setupFilterMenuBox = function (parent) {
	var self = this;

	var filterMenuBox = parent.createChild('div', { className: 'filterMenuBox' });
	var filterMenu = filterMenuBox.createChild('div', { className: 'filterMenu' });

	this.filterBtn = filterMenu.appendChild(new Button({
		text: getText('tablet.mount.filter'),
		className: ['button', 'filterButton'],
		addIcon: 'before'
	}, function () {
		self._setFilterBoxVisible(!self.isFilterBoxVisible);
	}));

	// sort
	var sortSelector = filterMenu.appendChild(new Selector({ className: 'sortSelector' }));

	this.sorters = [
		{ name: getText('ui.common.sort') + getText('ui.common.colon'), property: 'id' },
		{ name: getText('tablet.mount.type'), property: 'model' },
		{ name: getText('ui.common.sex'), property: 'sex' }, // 0 male, 1 female
		{ name: getText('ui.common.name'), property: 'name' },
		{ name: getText('ui.common.level'), property: 'level' }
	];

	for (var i = 0; i < this.sorters.length; i += 1) {
		var sorter = this.sorters[i];
		sortSelector.addOption(sorter.name, sorter.property); // 'label', value
		sortSelector.toggleOption(i, true);
	}

	sortSelector.on('change', this._changeSorter.bind(this));

	this.selectedSorter = sortSelector.selectFirst(/*silently=*/true);

	this._createSelectAllOrNone(filterMenu);

	// active filter list status bar & tooltip
	var statusBar = this.statusBar = filterMenuBox.createChild('div', { className: 'statusBar' });

	var statusBarTooltip = new WuiDom('div', { className: 'statusBarTooltip' });
	statusBarTooltip.createChild('div', { className: 'title', text: getText('tablet.mount.activeFilters') });
	statusBarTooltip.filterList = null;
	TooltipBox.addTooltip(statusBar, function () {
		if (statusBarTooltip.filterList) { statusBarTooltip.removeChild(statusBarTooltip.filterList); }
		statusBarTooltip.filterList = statusBarTooltip.appendChild(self._buildFilterDescription());
		return statusBarTooltip;
	});
};

BreedingWindow.prototype._createSelectAllOrNone = function (parent) {
	var self = this;

	var label = getText('ui.common.all') + ' / ' + getText('ui.common.none');
	var checkbox = this.allNoneCheckbox = parent.appendChild(new CheckboxLabel(label));
	checkbox.addClassNames('allNoneCheckbox');

	checkbox.on('change', function (isOn) { self._setMultiselect(isOn, true); });
};

BreedingWindow.prototype._setupDropZones = function () {
	var self = this;

	function droppedMount(sourceElement, sourceId, sourceData) {
		self._droppedMount(this, sourceElement, sourceData);
	}
	function dragEntered() {
		self._handleDragEnter(this.id, true);
	}
	function dragLeft() {
		self._handleDragEnter(this.id, false);
	}

	var dropZoneIds = [];
	for (var id in this.rooms) {
		dropZoneIds.push(id);

		// room tabs
		var tab = this.roomTabs.getTabsMap()[id];
		if (!tab) {
			continue;
		}

		var tabDom = this.roomTabs.getTabsMap()[id].tab;
		dragManager.setDroppable(tabDom, [DRAG_MOUNT_ID]);
		tabDom.id = id; // for access as sourceElement

		tabDom.on('drop', droppedMount);
		tabDom.on('dragEnter', dragEntered);
		tabDom.on('dragLeave', dragLeft);
	}

	this.roomDropZones = this.roomBoxes.createChild('div', { className: 'roomDropZones' });

	for (var i = 0; i < dropZoneIds.length; i += 1) {
		id = dropZoneIds[i];

		var dropZone = this.dropZones[id] = new WuiDom('div', {
			className: ['dropZone', id, 'transition']
		});
		dropZone.id = id;

		var room = this.rooms[id];
		if (id === 'equip') {
			this.equipBox.box.appendChild(dropZone);
			dropZone.addClassNames('equip');
		} else {
			this.roomDropZones.appendChild(dropZone);
			dropZone.addClassNames('room');
		}

		dropZone.createChild('div', {
			className: 'amount',
			name: 'amount'
		});
		dropZone.createChild('div', {
			className: 'label',
			text: room.name,
			name: 'label'
		});

		dragManager.setDroppable(dropZone, [DRAG_MOUNT_ID]);
		dropZone.on('drop', droppedMount);

		dropZone.on('dragEnter', dragEntered);
		dropZone.on('dragLeave', dragLeft);
	}
};

BreedingWindow.prototype._setupMountFilterBox = function (parent) {
	if (!this.isWindowSizeFull) {
		return this.once('opened', this._setupMountFilterBox.bind(this, parent));
	}

	this.mountFilterBox = parent.appendChild(new MountFilterBox({ className: 'transition' }));

	this._updateTypeFilters();

	var self = this;
	this.mountFilterBox.on('activeFiltersUpdated', function (activeFilters) {
		self.activeFilters = activeFilters;
		self.isFilterEmpty = isEmptyObject(activeFilters);

		self._setMultiselect(false);
		self._updateDisplayedRoom();
		self._updateStatusBar();
	});
};

BreedingWindow.prototype._receiveMountData = function (mountData) {
	var mountId = mountData.id, tile;
	if (!this.certificateQueue.length) {
		// mount data update received - e.g. after feeding
		tile = this._findTileInRooms(mountId);
		if (!tile) { return console.error('Received data about unknown mount ', mountData); } // stack not needed

		tile.mountData = this._prepareMountForRoom(mountData, tile.room);
		this._refreshTile(tile);
		if (tile === this.focusedTile) { this._displayMountDetails(mountData); }
		return;
	}
	var certificateData = this.certificateQueue.shift();
	var certificateId = CERTIF_ID_PREFIX + certificateData.objectUID;

	this.mountDataFromCertifId[certificateId] = this._prepareMountForRoom(mountData, this.rooms.certificate);
	// For newborn certificates we have 2 entries in babyMap - for mountId and certificateId
	if (mountData.isNewborn) { this.babyMap[certificateId] = this.babyMap[mountId]; }

	tile = this.rooms.certificate.getTile(certificateId);
	tile.mountData.receivedData = mountData;
	this._refreshTile(tile);
	tile.setSpinnerVisible(false);

	if (this.certificateTilePendingSelection === tile) {
		this.certificateTilePendingSelection = null;
		this._selectTile(this.rooms.certificate, tile);
	}

	this.nonLoadedCertifCount--;
	if (this.certifAreRequested) { this.waitingGauge.refreshGauge(this.nonLoadedCertifCount); }

	if (!CERTIF_BULK_LOAD) {
		// request data from next certificate
		var nextCertificate = this.certificateQueue[0];
		if (nextCertificate) {
			return this._requestMountData(nextCertificate);
		}
	}

	if (this.nonLoadedCertifCount === 0) {
		if (this.certifAreRequested) {
			this.certifAreRequested = false;
			if (this.openedRoom.id === 'certificate') { this._updateDisplayedRoom(); }
		}
	}
};

BreedingWindow.prototype._requestOneCertificate = function (certificate) {
	if (this.certificateQueue.indexOf(certificate) >= 0) { return; } // already in request queue

	this.certificateQueue.push(certificate);

	if (!CERTIF_BULK_LOAD && this.certificateQueue.length > 1) {
		return; // already processing => simply wait
	}

	this._requestMountData(certificate);
};

BreedingWindow.prototype._requestAllCertificates = function () {
	this.certifAreRequested = true;
	this.waitingGauge.showGauge(this.nonLoadedCertifCount,
		getText('tablet.mount.loadingCertif', this.nonLoadedCertifCount));

	var mountMap = this.rooms.certificate.mountMap;
	for (var certifId in mountMap) {
		// if we already have mount data for this certificate, skip
		if (this.mountDataFromCertifId[certifId]) { continue; }

		this._requestOneCertificate(mountMap[certifId].certificate);
	}
};

// Handles the tap on tiles, except for "equipped" tile
BreedingWindow.prototype.tileTapHandler = function (tile) {
	// Anyway hide filter box if there
	this._setFilterBoxVisible(false);

	if (tile.mountData.certificate && !tile.mountData.receivedData) {
		tile.setSpinnerVisible(true);
		this.certificateTilePendingSelection = tile;
		return this._requestOneCertificate(tile.mountData.certificate);
	}

	// Tap on selected tile (= "tap + tap" too) starts multiselect & selects current tile
	if (tile.selected && !this.isMultiselect) {
		this._setMultiselect(true);
	}

	this._selectTile(tile.room, tile);
};

BreedingWindow.prototype._purgeNewbornList = function () {
	var now = Date.now();
	for (var id in this.babyMap) {
		if (now - this.babyMap[id] > NEWBORN_PURGE_DELAY) {
			delete this.babyMap[id];
		}
	}
};

BreedingWindow.prototype._prepareMountForRoom = function (mountData, room) {
	mountData.mountLocation = room.id;

	// isNewborn (called "borning" in Flash code)
	mountData.isNewborn = !!(this.babyMap[mountData.id] ||
		(mountData.receivedData && this.babyMap[mountData.receivedData.id]));

	return mountData;
};

BreedingWindow.prototype._addMountsToRoom = function (room, mounts) {
	mounts = Array.isArray(mounts) ? mounts : [mounts];
	var count = mounts.length;
	for (var i = 0; i < count; i++) {
		room.addMount(this._prepareMountForRoom(mounts[i], room));
	}

	if (this.numMassAdd) {
		this.numMassAdd -= count;
		this.waitingGauge.refreshGauge(this.numMassAdd + this.numMassRemove);
	}
	// If last step of mass-move OR not a mass-move, refresh display
	if (this.numMassAdd === 0) {
		this._updateRoomTab(room);
		if (room === this.openedRoom) { this._updateDisplayedRoom(); }
		this._updateTypeFilters(); // TODO: only call if detect new model type
	}
};

BreedingWindow.prototype._removeMountsFromRoom = function (room, mountIds) {
	mountIds = Array.isArray(mountIds) ? mountIds : [mountIds];
	var count = mountIds.length;

	// Hide current mount if it is removed from its room (not selected anymore)
	var currentMountId = this.focusedTile && this.focusedTile.id;
	if (mountIds.indexOf(currentMountId) !== -1) {
		this._hideMountDetails();
		this.focusedTile = null;
	}

	for (var i = 0; i < mountIds.length; i += 1) {
		room.removeMount(mountIds[i]);
	}

	if (this.numMassRemove) {
		this.numMassRemove -= count;
		this.waitingGauge.refreshGauge(this.numMassAdd + this.numMassRemove);
	}
	// If last step of mass-move OR not a mass-move, refresh display
	if (this.numMassRemove === 0) {
		// switch back to single select if all selected have moved out
		if (room === this.selectionRoom && room.getNumSelected() === 0) {
			this._setMultiselect(false);
		}
		this._updateRoomTab(room);
		if (room === this.openedRoom) { this._updateDisplayedRoom(); }
		this._updateTypeFilters();
	}
};

// Adds *raw* certificates to certificate room
BreedingWindow.prototype._addCertificates = function (itemInstances) {
	var certificates = this._extractCertificates(itemInstances);
	var mounts = [];
	for (var i = 0; i < certificates.length; i++) {
		var certificate = certificates[i], mountInfo = certificate.mountInfo;
		var certificateId = CERTIF_ID_PREFIX + certificate.objectUID;
		var mountData = this.mountDataFromCertifId[certificateId];
		if (!mountData) { this.nonLoadedCertifCount++; }

		mounts.push({
			id: certificateId,
			certificate: certificate,
			model: mountInfo.modelId,
			name: mountInfo.name,
			receivedData: mountData // can be undefined
		});
	}
	this._addMountsToRoom(this.rooms.certificate, mounts);
};

BreedingWindow.prototype._removeCertificates = function (itemInstances) {
	var mountIds = [];
	for (var i = 0; i < itemInstances.length; i += 1) {
		var certificateId = CERTIF_ID_PREFIX + itemInstances[i].objectUID;

		var mountData = this.mountDataFromCertifId[certificateId];
		if (mountData) {
			delete this.mountDataFromCertifId[certificateId]; // certificate "disappears" for good
		} else {
			this.nonLoadedCertifCount--;
		}

		mountIds.push(certificateId);
	}
	this._removeMountsFromRoom(this.rooms.certificate, mountIds);
};

// NOTE: certificates are item instances that can be used to get mountClientData
BreedingWindow.prototype._extractCertificates = function (itemInstancesOrIds) {
	var inventory = window.gui.playerData.inventory;
	var certificates = [];

	for (var i = 0; i < itemInstancesOrIds.length; i += 1) {
		var itemOrId = itemInstancesOrIds[i];
		var certificate = itemOrId.objectUID ? itemOrId : inventory.objects[itemOrId];
		if (!this._enrichCertificateData(certificate)) { continue; }
		certificates.push(certificate);
	}
	return certificates;
};

BreedingWindow.prototype._enrichCertificateData = function (certificate) {
	var effectsMap = certificate.effectsMap;
	var idInfo = effectsMap[EFFECT_MOUNT];
	if (!idInfo) { return false; } // not sure it happens; just to be safe

	// Filter out invalid certificates
	if (effectsMap[EFFECT_INVALID]) { return false; }

	var info = { mountId: idInfo.mountId, date: idInfo.date, modelId: idInfo.modelId };

	var nameInfo = effectsMap[EFFECT_NAME];
	if (nameInfo) { info.name = nameInfo.text; }

	var validityInfo = effectsMap[EFFECT_VALIDITY];
	if (validityInfo) {
		info.validityDays = validityInfo.days;
		info.validityHours = validityInfo.hours;
		info.validityMinutes = validityInfo.minutes;
		info.validityDesc = validityInfo.description;
	}

	var ownerInfo = effectsMap[EFFECT_OWNER];
	if (ownerInfo) { info.ownerDesc = ownerInfo.description; }

	certificate.mountInfo = info;
	return true;
};

BreedingWindow.prototype._requestMountData = function (certificate) {
	var mountInfo = certificate.mountInfo;
	window.dofus.sendMessage('MountInformationRequestMessage', {
		id: mountInfo.mountId,
		time: mountInfo.date // NOTE: "time" means long "date" in message protocol
	});
	// response -> MountDataMessage, MountDataErrorMessage
};

BreedingWindow.prototype._updateRoomTab = function (room) {
	// update ui displays (numbers on tabs, list of filters, etc)
	var roomTab = this.roomTabs.getTabsMap()[room.id];
	if (!roomTab) { return; } // e.g. the 'equip' room has no tab to update

	var statusLabel = roomTab.tab.statusLabel;
	var capacityStr = '(<span class="highlight">' + room.numMounts;
	if (room.capacity !== undefined && room.capacity !== Number.POSITIVE_INFINITY) {
		capacityStr += '</span> / ' + room.capacity + ')';
	} else {
		capacityStr += '</span>)';
	}
	statusLabel.setHtml(capacityStr);
};

BreedingWindow.prototype._showRoomPlaceholderIfNeeded = function () {
	var room = this.openedRoom;
	var numHidden = room.getNumHiddenMounts(), numMounts = room.numMounts;

	var text = null;
	if (numMounts === 0) {
		text = getText('tablet.mount.emptyRoom');
	} else if (numMounts === numHidden) {
		text = getText('tablet.mount.filteredMounts', numMounts);
	}

	room.toggleDisplay(!text);
	this.roomPlaceholder.setText(text); // NB: room must be hidden for placeholder to compute its size OK
};

BreedingWindow.prototype._updateDisplayedRoom = function () {
	var room = this.openedRoom;
	if (!room) { return; }

	if (room.id === 'certificate' && !this.isFilterEmpty) {
		if (this._initLoadAllCertificates()) { return; } // refresh triggered at end of async loading
	}

	room.refreshDisplay(this.activeFilters, this.selectedSorter);
	this._showRoomPlaceholderIfNeeded();
};

// Called to refresh display when data of a tile's mount has been modified
BreedingWindow.prototype._refreshTile = function (tile) {
	tile.refreshDisplay();
	// refreshing the room is necessary (e.g. for filters)
	if (tile.room === this.openedRoom) { this._updateDisplayedRoom(); }
};

BreedingWindow.prototype._clearSelection = function () {
	var focusedTile = this.focusedTile;
	if (focusedTile) {
		focusedTile.room.setMountSelected(focusedTile.id, false);
		this.focusedTile = null;
	}

	if (this.selectionRoom) {
		this.selectionRoom.unselectAll();
		this.selectionRoom = null;
	}
};

BreedingWindow.prototype._setMultiselect = function (isMultiselect, shouldSelectAll) {
	this.allNoneCheckbox.toggleActivation(isMultiselect, /*isSilent=*/true);

	this.isMultiselect = isMultiselect;
	this._clearSelection();
	this._hideMountDetails();

	if (isMultiselect) {
		this.selectionRoom = this.openedRoom;
		if (shouldSelectAll) {
			this.openedRoom.selectAll();
		}
	}
};

BreedingWindow.prototype._selectTile = function (room, tile) {
	var previousFocusedTile = this.focusedTile;

	// switch back to single select if new tile is not in same room
	if (this.isMultiselect && tile.room !== this.selectionRoom) { // NB: also works for equipped mount
		this._setMultiselect(false);
	}

	if (this.isMultiselect) {
		room.setMountSelected(tile.id, !tile.selected);
		// switch back to single select if user manually unselects all
		if (room.getNumSelected() === 0) {
			return this._setMultiselect(false);
		}
	} else {
		// Single select mode - tapping on a tile unselects previous unless current
		if (tile === previousFocusedTile) { return; }
		if (previousFocusedTile) {
			previousFocusedTile.room.setMountSelected(previousFocusedTile.id, false);
		}
		room.setHightlightedMount(tile.id);
	}
	this.focusedTile = tile;
	this._displayMountDetails(tile.mountData);
};

BreedingWindow.prototype._updateEquipBox = function (isInit) {
	// Get equipped mount data; could be null if no equipped mount
	var mountData = window.gui.playerData.equippedMount;
	if (mountData) { this._prepareMountForRoom(mountData, this.rooms.equip); }

	this.equipBox.updateMount(mountData);

	if (isInit) { return; } // for initialization, nothing else to do here

	var isFocusOnEquippedMount = this.focusedTile === this.equipBox.tile;

	if (mountData) {
		if (isFocusOnEquippedMount) {
			// equipped mount was modified; refresh mount details
			this._displayMountDetails(mountData);
		} else {
			// mount was just equipped - we received a MountSetMessage
			this._selectTile(this.rooms.equip, this.equipBox.tile);
		}
	} else {
		// If previously equipped mount was displayed, remove it from there
		if (isFocusOnEquippedMount) {
			this._hideMountDetails();
		}
	}
};

BreedingWindow.prototype._hideMountDetails = function () {
	var mountDetails = this.focusedMountDetails;
	mountDetails.hide();

	mountDetails.placeholder.toggleDisplay(true);
	var msg = getText(this.isMultiselect ? 'tablet.mount.pendingMultiselect' : 'tablet.mount.selectMount');
	mountDetails.placeholder.setText(msg);
};

BreedingWindow.prototype._displayMountDetails = function (mountData) {
	if (mountData.certificate) {
		mountData = mountData.receivedData;
		if (!mountData) {
			return this._hideMountDetails();
		}
	}

	var mountDetails = this.focusedMountDetails;

	mountDetails.show();
	mountDetails.placeholder.toggleDisplay(false);

	mountDetails.dragInfo.setMount(mountData);

	mountDetails.setMount(mountData, { context: 'breeding' });
};

BreedingWindow.prototype._requestExchangeBetweenRooms = function (fromRoomId, toRoomId, mountId) {
	var exchangeAction = exchangeHandleEnum[fromRoomId][toRoomId];
	if (!exchangeAction) {
		return;
	}

	//console.log('exchangeHandleEnum from', from, 'to', to, '->', exchangeHandleEnum[from][to])
	// NOTE: for certificates, the mountId given should be substituted with the item UID of certificate in inventory
	window.dofus.sendMessage('ExchangeHandleMountStableMessage', {
		actionType: exchangeAction,
		rideId: mountId
	});

	// NOTE: when exchanging, consider "equip" as just another room

	// response ->
	/*
		ExchangeMountStableErrorMessage
		ExchangeMountStableAddMessage
		ExchangeMountStableRemoveMessage
		ExchangeMountPaddockAddMessage
		ExchangeMountPaddockRemoveMessage
		MountSetMessage
		MountUnsetMessage
	*/
};

// Get the ID used for an exchange between rooms.
// NB: when moving out of certificates, we need the item UID instead of mount ID.
BreedingWindow.prototype._getIdForExchange = function (fromRoomId, id) {
	if (fromRoomId !== 'certificate') {
		return id;
	} else {
		// id is already a certificate ID, just remove the prefix
		return ~~id.substr(1);
	}
};

BreedingWindow.prototype._moveMounts = function (fromRoomId, toRoomId, selectedMountIds, count) {
	if (count === undefined) { count = selectedMountIds.length; }

	var numOperations = NUM_STEPS_FOR_MOVE * count; // 1 remove + 1 add for each mount
	this.waitingGauge.showGauge(numOperations, getText('tablet.mount.moving', count), NUM_STEPS_FOR_MOVE);
	this.numMassRemove = this.numMassAdd = count;

	for (; count > 0; count--) {
		var requestedId = this._getIdForExchange(fromRoomId, selectedMountIds.pop());

		this._requestExchangeBetweenRooms(fromRoomId, toRoomId, requestedId);
		// _addMountsToRoom and _removeMountsFromRoom will be called when we receive server msgs
	}
};

BreedingWindow.prototype.prepareDraggedTiles = function (mountData) {
	var sourceRoom = this.rooms[mountData.mountLocation];

	// auto select dragged tile if not selected yet
	var draggedTile = sourceRoom.getTile(mountData.id);
	if (!draggedTile.selected) {
		this._selectTile(sourceRoom, draggedTile);
	}

	return sourceRoom.getNumSelected();
};

BreedingWindow.prototype._startDragging = function (sourceElement, sourceData) {
	var self = this;

	this.roomDropZones.addClassNames('enable');
	sourceElement.addClassNames('dragging');

	var mountData = sourceData.mount;
	var sourceRoom = this.rooms[mountData.mountLocation];

	var numDragged = sourceRoom.getNumSelected();

	// enable drop zones based on which room
	this.dragTimeout = setTimeout(function () {
		for (var id in self.dropZones) {
			var dropZone = self.dropZones[id];

			// NOTE: equip dropzone is not enabled if you drag more than 1
			dropZone.isEnabled = (id !== sourceRoom.id &&
				(dropZone.id !== 'equip' || numDragged <= 1));
			dropZone.toggleClassName('enable', dropZone.isEnabled);
			if (!dropZone.isEnabled) { continue; }

			var room = self.rooms[id];
			var howManyEnter = room.capacity - room.numMounts;
			var dropAmountStr = '';
			if (numDragged > howManyEnter) {
				if (howManyEnter > 0) {
					dropAmountStr = getText('tablet.mount.roomLeft', howManyEnter);
				} else {
					dropAmountStr = getText('tablet.mount.roomFullShort');
				}
			}
			dropZone.toggleClassName('warning', !!dropAmountStr && howManyEnter > 0);
			dropZone.toggleClassName('full', !!dropAmountStr && howManyEnter <= 0);
			dropZone.getChild('amount').setText(dropAmountStr);
		}
	}, DROP_TIMEOUT);

	this._setFilterBoxVisible(false);
};

// NB: this is called BEFORE _droppedMount
BreedingWindow.prototype._endDragging = function (sourceElement) {
	clearTimeout(this.dragTimeout);
	sourceElement.delClassNames('dragging');

	for (var id in this.dropZones) {
		var dropZone = this.dropZones[id];
		dropZone.delClassNames('enable', 'dragEnter');

		// associated tab
		var tab = this.roomTabs.getTabsMap()[id];
		if (tab) {
			var tabDom = tab.tab;
			tabDom.delClassNames('dragEnter');
		}
	}
	this.roomDropZones.delClassNames('enable');

	if (dragManager.isLostDrop) {
		// Deselect if unloaded certificate (tile was selected for DND but user gave up)
		if (this.focusedTile) {
			var mountData = this.focusedTile.mountData;
			if (mountData.certificate && !mountData.receivedData) {
				this._clearSelection();
			}
		}
	}
};

BreedingWindow.prototype._handleDragEnter = function (roomId, enteredDrag) {
	// update both dropzone and, if available, associated tab
	var dropZone = this.dropZones[roomId];
	dropZone.toggleClassName('dragEnter', enteredDrag);

	var tab = this.roomTabs.getTabsMap()[roomId];
	if (tab) {
		var tabDom = tab.tab;
		tabDom.toggleClassName('dragEnter', enteredDrag && dropZone.isEnabled);
	}
};

BreedingWindow.prototype._droppedMount = function (dropZone, sourceElement, sourceData) {
	var mount = sourceData.mount; // can be tile.mountData or mountDetailsBox.mountData

	var fromRoomId = mount.mountLocation;
	var toRoomId = dropZone.id; // dropzone id is also its room (can be overlaid dropzone or room tab)
	if (fromRoomId === toRoomId) {
		return;
	}

	// check capacity
	var fromRoom = this.rooms[fromRoomId];
	var toRoom = this.rooms[toRoomId];

	// room to room, equip to room, room to equip
	var availableSpace = toRoomId !== 'equip' ? toRoom.capacity - toRoom.numMounts : toRoom.capacity;
	var selectedMountIds = toRoomId !== 'equip' ? fromRoom.getSelection() : [mount.id];
	var numDragged = selectedMountIds.length;

	if (availableSpace <= 0) {
		window.gui.openSimplePopup(getText('tablet.mount.roomFull'));
	} else if (availableSpace < numDragged) {
		var self = this;
		window.gui.openConfirmPopup({
			title: getText('ui.popup.warning'),
			message: getText('tablet.mount.partialMoveMounts', availableSpace),
			cb: function (result) {
				if (!result) { return; }
				self._moveMounts(fromRoomId, toRoomId, selectedMountIds, availableSpace);
			}
		});
	} else { // all mounts can move
		this._moveMounts(fromRoomId, toRoomId, selectedMountIds);
	}
};

BreedingWindow.prototype._findTileInRooms = function (tileId) {
	for (var id in this.rooms) {
		var tile = this.rooms[id].getTile(tileId);
		if (tile) { return tile; }
	}
	return null; // not found in any room
};

// Returns true if async load will trigger the refresh later
BreedingWindow.prototype._initLoadAllCertificates = function () {
	if (this.nonLoadedCertifCount === 0) { return false; }
	this.rooms.certificate.lockRoom();
	this.roomPlaceholder.setText(' '); // hides the room with no message since gauge will show
	this._requestAllCertificates();
	return true;
};

BreedingWindow.prototype._changeSorter = function (property) {
	this.selectedSorter = property;
	if (this.openedRoom.id === 'certificate' && !isCertifBaseProperty[property]) {
		if (this._initLoadAllCertificates()) { return; }
	}
	this._updateDisplayedRoom();
};

BreedingWindow.prototype._setFilterBoxVisible = function (shouldShow) {
	this.isFilterBoxVisible = shouldShow;
	this.filterBtn.toggleClassName('enabled', shouldShow);
	this.mountFilterBox.toggleClassName('enable', shouldShow);
};

BreedingWindow.prototype._updateTypeFilters = function () {
	if (!this.mountFilterBox) { return; }

	var typeIds = []; // mount types player has available
	var typeId;

	// get typeId if at least one exists in any room
	for (var roomId in this.rooms) {
		var mountMap = this.rooms[roomId].mountMap;
		for (var mountId in mountMap) {
			typeId = mountMap[mountId].model;
			if (typeIds.indexOf(typeId) === -1) {
				typeIds.push(typeId);
			}
		}
	}

	// enable options that are still searchable
	this.mountFilterBox.updateTypeSelector(typeIds);
};

BreedingWindow.prototype._buildFilterDescription = function () {
	var content = new WuiDom('div');
	var ids = Object.keys(this.activeFilters);
	for (var i = 0; i < ids.length; i++) {
		var id = ids[i];
		var activeFilter = this.activeFilters[id];

		var filterName;
		if (!activeFilter.interval) { // flag
			filterName = activeFilter.args[0] ? activeFilter.name : activeFilter.antiName;
		} else { // range
			filterName = this.mountFilterBox.filterBoxes[id].label.getText(); // includes name and set range
		}

		var coma = i < ids.length - 1 ? ',' : ''; // last one is not followed by a coma

		var filterLabelBox = content.createChild('span', {
			className: 'filterLabelBox',
			text: (filterName || activeFilter.name) + coma
		});

		// if inverse filter selected with no custom-defined antiname, show normal name with strikethrough
		filterLabelBox.isAnti = !filterName;
		filterLabelBox.toggleClassName('anti', filterLabelBox.isAnti);
	}
	return content;
};

BreedingWindow.prototype._updateStatusBar = function () {
	this.filterBtn.toggleClassName('hasFilter', !isEmptyObject(this.activeFilters));

	this.statusBar.clearContent();
	this.statusBar.appendChild(this._buildFilterDescription());
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/BreedingWindow/index.js
 ** module id = 651
 ** module chunks = 0
 **/