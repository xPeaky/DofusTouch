require('./room.less');
var EventEmitter = require('events.js');
var inherits = require('util').inherits;
var isEmptyObject = require('helper/JSUtils').isEmptyObject;
var MountBox = require('./MountBox');
var Scroller = require('Scroller');

var TILE_MARGIN = 4; // px - in line with CSS

var MIN_GRIP_WIDTH = 37; // px; min width of scroll grip
var GRIP_MARGIN = 14; // extra px needed around sides of grip (e.g. scroller displays on the right)

var MAX_SCROLL_SPEED = 1.5; // under 1 is not very nice for player
var REFRESH_INTERVAL = 90;
var FIRST_REFRESH = 100; // ms; delay before 1st refresh. Too early makes first slide "stutter"
var MAX_REFRESH_ROWS = 2; // max number of rows refreshed per "tick" (1 or 2 seems good)


function Room(breedingWindow, id, name, capacity) {
	EventEmitter.call(this);

	this.breedingWindow = breedingWindow;
	this.id = id;
	this.name = name || '';
	this.capacity = capacity || Number.POSITIVE_INFINITY;

	this.box = null; // WuiDom of tile container

	this.reset();
}

inherits(Room, EventEmitter);
module.exports = Room;


Room.prototype.reset = function () {
	this.delayedSetup = 0; // number of times we delayed the CSS setup

	// Infinite scrolling
	this._stopTicker();
	this.refreshInterval = null;
	this.lastRenderedScrollY = -1;
	this.scrollStartTime = 0;
	this.isScrolling = false;
	this.isRefreshComplete = true;

	this.numMounts = 0;
	this.mountMap = {};

	this.selectedTiles = {};
	this.numSelected = 0;

	this.isLocked = false;
	this.needsScrollerRefresh = false;
	this.needRefilter = false;
	this.hasNoFilter = true;
	this.hasNoSorter = true;
	this.currentSorter = '';
	this.tilesPerPage = 0;
	this.allTiles = []; // matches this.box.getChildren()
	this.allVisibleTiles = [];

	if (this.box) {
		this.box.clearContent();
		this.scroller.goToTop();
	}
};

Room.prototype.createBox = function (parent) {
	var scroller = this.scroller = parent.appendChild(
		new Scroller(null, { maxSpeed: MAX_SCROLL_SPEED, bounce: true }));
	scroller.room = this;
	scroller.setStyle('maxHeight', parent.rootElement.clientHeight + 'px');
	scroller.on('scrollStart', onScrollStart);
	scroller.on('scrollEnd', onScrollEnd);
	scroller.on('scrollCancel', onScrollCancel);

	var roomBox = scroller.content.createChild('div', { className: ['roomBox', this.id] });
	this.box = roomBox.createChild('div', { className: 'tileRoom' });
	this.scrollGrip = roomBox.createChild('div', { className: 'scrollGrip' });

	return scroller;
};

Room.prototype.getTile = function (tileId) {
	return this.box.getChild(tileId);
};

Room.prototype.setMountSelected = function (tileId, shouldSelect) {
	var tile = this.getTile(tileId);
	if (!tile) { return console.error('Invalid tileId:', tileId); } // no need for stack; debug only

	if (shouldSelect) {
		if (!tile.selected) {
			this.selectedTiles[tileId] = tile;
			this.numSelected++;
		}
	} else {
		if (tile.selected) {
			delete this.selectedTiles[tileId];
			this.numSelected--;
		}
	}
	tile.setTileSelected(shouldSelect);
	return tile;
};

Room.prototype.setHightlightedMount = function (tileId) {
	var tile = this.setMountSelected(tileId, true);
	tile.highlightTile();
};

Room.prototype.selectAll = function () {
	var tiles = this.allVisibleTiles;
	for (var i = 0; i < tiles.length; i++) {
		var tile = tiles[i];
		if (tile.selected) { continue; }

		this.selectedTiles[tile.id] = tile;
		tile.setTileSelected(true);
	}
	this.numSelected = tiles.length;
};

Room.prototype.unselectAll = function () {
	for (var tileId in this.selectedTiles) {
		var tile = this.selectedTiles[tileId];
		tile.setTileSelected(false);
	}
	this.selectedTiles = {};
	this.numSelected = 0;
};

/**
 * Returns an array of all the IDs in the current selection
 */
Room.prototype.getSelection = function () {
	return Object.keys(this.selectedTiles);
};

/**
 * Returns the number of tiles in the current selection
 */
Room.prototype.getNumSelected = function () {
	return this.numSelected;
};

Room.prototype.getNumHiddenMounts = function () {
	return this.allTiles.length - this.allVisibleTiles.length;
};

Room.prototype.addMount = function (mountData) {
	this.mountMap[mountData.id] = mountData;
	this.numMounts++;

	var tile = new MountBox(mountData, this);
	this.box.appendChild(tile);

	this.allTiles.push(tile);
	if (this.hasNoSorter) {
		this.allVisibleTiles.push(tile);
	} else {
		this.currentSorter = null; // forces re-sort; sorting will force re-filter
	}
	this.needsScrollerRefresh = true;
};

Room.prototype.removeMount = function (mountId) {
	var mountData = this.mountMap[mountId];
	if (!mountData) {
		return console.warn('removeMount: invalid ID:', mountId);
	}

	var tile = this.box.getChild(mountId);

	delete this.mountMap[mountId];
	this.numMounts--;

	if (tile.selected) {
		delete this.selectedTiles[mountId];
		this.numSelected--;
	}

	var tileNdx = this.allTiles.indexOf(tile);
	this.allTiles.splice(tileNdx, 1);

	// For "visible" tiles we also need to tell all following tiles they need to "move" forward
	var tiles = this.allVisibleTiles;
	tileNdx = tiles.indexOf(tile);
	tiles.splice(tileNdx, 1);
	for (var i = tiles.length - 1; i >= tileNdx; i--) {
		tiles[i].markForReorder();
	}
	tile.hideTile();

	this.box.removeChild(mountId);
	this.needsScrollerRefresh = true;
};

Room.prototype._sortByProperty = function (property /*,isAscending*/) {
	if (property === this.currentSorter) { return; }
	this.currentSorter = property;
	this.hasNoSorter = false;

	var isAscending = false; // could be parameter - not used now
	var coeff = isAscending ? -1 : 1; // ascend descend

	function byMountProperty(a, b) {
		var dataA = a.mountData, dataB = b.mountData;
		if (dataA.receivedData) { dataA = dataA.receivedData; }
		if (dataB.receivedData) { dataB = dataB.receivedData; }

		if (dataA[property] > dataB[property]) {
			return coeff; // ascend descend
		}
		if (dataA[property] < dataB[property]) {
			return -coeff;
		}

		// take ID as default
		if (dataA.id > dataB.id) {
			return coeff;
		}
		return -coeff;
	}

	this._hideAllTiles(); // hide them before we move them around
	this.needRefilter = true;

	this.allTiles.sort(byMountProperty);

	// Re-append the tites in sorted order
	var tiles = this.allTiles;
	for (var i = 0; i < tiles.length; i++) {
		this.box.appendChild(tiles[i]);
	}
};

Room.prototype._filter = function (filters) {
	filters = filters || {};

	var isEmptyFilter = isEmptyObject(filters);
	if (isEmptyFilter && this.hasNoFilter && !this.needRefilter) {
		return; // asking for empty filter while we are already not filtered; we are done
	}
	this.needsScrollerRefresh = true; // because number of displayed tiles changes
	this.hasNoFilter = isEmptyFilter;
	this.needRefilter = false;

	this._hideAllTiles();

	// run tiles through each active filter until one fails, or show the tile
	this.allVisibleTiles = [];
	var tiles = this.allTiles;
	for (var i = 0; i < tiles.length; i++) {
		var tile = tiles[i];
		var isMatch = true;
		for (var id in filters) {
			var filter = filters[id];
			if (!this._filterTile(tile.mountData, filter.do, filter.args)) {
				isMatch = false;
				break;
			}
		}
		if (isMatch) {
			this.allVisibleTiles.push(tile);
			tile.showTile();
		}
	}
};

Room.prototype._filterTile = function (mountData, filterFn, args) {
	if (args === null || args === undefined) { return true; }
	args = Array.isArray(args) ? args : [args]; // filter benchmarks, flags, etc as needed

	if (mountData.receivedData) { mountData = mountData.receivedData; }

	return filterFn.apply(mountData, args);
};

Room.prototype.toggleDisplay = function (shouldShow) {
	this.scroller.toggleDisplay(shouldShow);
};

// e.g. when player refused to load all certificates while a filter is on, we hide them all!
// Calling refreshDisplay automatically unlocks the room.
Room.prototype.lockRoom = function () {
	this.isLocked = true;
	this.scroller.hide();
	this._hideAllTiles();
};

Room.prototype.refreshDisplay = function (filters, sorter) {
	if (this.isLocked) {
		this.isLocked = false;
		this._showAllTiles();
	}
	this.scroller.show(); // could be hidden by lockRoom or toggleDisplay

	if (sorter) { this._sortByProperty(sorter); }

	this._filter(filters);

	if (!this.tilesPerPage) {
		return this._setupLayout();
	}
	if (this.needsScrollerRefresh) {
		this.scroller.refresh(); // number of tiles can change with the filter
		this.needsScrollerRefresh = false;
	}

	this._refreshView(/*isForced=*/true);
};

Room.prototype._setupLayout = function () {
	if (!this.allVisibleTiles.length) { return; }

	var parentBox = this.scroller.getParent().rootElement;
	var boxWidth = parentBox.clientWidth;
	var boxHeight = parentBox.clientHeight;

	var tile0 = this.allVisibleTiles[0];
	tile0.setStyle('opacity', 0);
	var tileWidth = tile0.rootElement.clientWidth;
	var columnWidth = this.columnWidth = tileWidth + TILE_MARGIN * 2;
	this.rowHeight = tile0.rootElement.clientHeight + TILE_MARGIN * 2;
	tile0.setStyle('opacity', null);

	var numColumns = Math.floor(boxWidth / columnWidth);
	var gripWidth = boxWidth - numColumns * columnWidth - GRIP_MARGIN;
	if (gripWidth < MIN_GRIP_WIDTH && numColumns > 1) {
		numColumns--;
		gripWidth += columnWidth;
	}
	this.numColumns = numColumns;
	var numRows = Math.ceil(boxHeight / this.rowHeight) + 1;
	this.tilesPerPage = numRows * this.numColumns; // counting 2 partially showed rows (top & bottom)

	// Having a full "page" of tiles above and below visible page allows "linear" scrolling without refresh
	this.extraTilesTopOrBottom = this.tilesPerPage;

	MountBox.prepareTilePool(this, Math.min(this.numMounts, this.tilesPerPage + 2 * this.extraTilesTopOrBottom));

	this.scrollGrip.setStyle('width', gripWidth + 'px');

	this.scroller.refresh();
	this._refreshView(/*isForced=*/true);
};

function onScrollStart() {
	// "this" is the Scroller
	var room = this.room;
	room.scrollStartTime = Date.now();
	room.isScrolling = true;
	if (room.refreshInterval) { return; } // interval is already running (stop+start); we are fine

	room.refreshInterval = window.setInterval(refreshRoomTick, REFRESH_INTERVAL, room);
}

function onScrollEnd() {
	// "this" is the Scroller
	this.room.isScrolling = false;
}

function onScrollCancel() {
	// "this" is the Scroller
	var room = this.room;
	room.isScrolling = false;
	room._stopTicker();
}

function refreshRoomTick(room) {
	if (Date.now() - room.scrollStartTime < FIRST_REFRESH) { return; }
	room._refreshView();
	if (room.isRefreshComplete && !room.isScrolling) {
		room._stopTicker();
	}
}

Room.prototype._stopTicker = function () {
	window.clearInterval(this.refreshInterval);
	this.refreshInterval = null;
};

Room.prototype._refreshView = function (isForced) {
	// Where is the scroller future position? (iScroll knows this value at beginning of scrolling)
	// NB: with bounce, iScroll.y can be >0 for a short time
	var scrollerY = Math.min(0, this.scroller.iScroll.y);
	if (this.isRefreshComplete && !isForced && Math.abs(scrollerY - this.lastRenderedScrollY) < this.rowHeight) {
		return;
	}
	var isScrollingUp = (scrollerY - this.lastRenderedScrollY) > 0;
	this.isRefreshComplete = false;

	var tiles = this.allVisibleTiles, numTiles = tiles.length;

	var numHiddenTopTiles = Math.floor(-scrollerY / this.rowHeight) * this.numColumns;

	// 3 bands: main one (visible), then 1 on top and 1 at bottom, both invisible when scrolling stops
	var firstMain = numHiddenTopTiles;
	var lastMain = Math.min(numHiddenTopTiles + this.tilesPerPage, numTiles);
	var extraTiles = this.extraTilesTopOrBottom;
	var firstTileToShow = Math.max(0, numHiddenTopTiles - extraTiles);
	var lastTileToShow = Math.min(numHiddenTopTiles + this.tilesPerPage + extraTiles, numTiles);

	// Hide any previously showed tile that is not in the list of "to be showed" anymore
	for (var i = 0; i < numTiles; i++) {
		// Skip the tiles that are still in the "to show" list
		if (i >= firstTileToShow && i < lastTileToShow) { continue; }
		tiles[i].prepareToGoOffScreen();
	}

	// Display new tiles - step by step to avoid too much impact on frame rate

	var maxChanges = isForced ? Infinity : this.numColumns * MAX_REFRESH_ROWS; // full rows look MUCH better

	// We refresh main band top-bottom or reversely, depending our scrolling direction
	var showedCount = showBandOfTiles(1, tiles, firstMain, lastMain, isScrollingUp, maxChanges);
	maxChanges -= showedCount;
	if (!showedCount || isForced) {
		// step 1 is completed, we go on with step 2
		showedCount = showBandOfTiles(2, tiles, firstMain, lastMain, isScrollingUp, maxChanges);
	}
	// When "forced" refresh (usually when scrolling is stopped), refresh out-of-screen bands too
	if (isForced) {
		showedCount += showBandOfTiles(1, tiles, firstTileToShow, lastTileToShow);
	}

	if (showedCount === 0) {
		this.isRefreshComplete = true;
		this.lastRenderedScrollY = scrollerY;
	}
};

// NB: lastNdx is not included in the band
function showBandOfTiles(numStep, tiles, firstNdx, lastNdx, fromBottom, maxUpdates) {
	if (lastNdx <= firstNdx) { return 0; }
	var first, last, direction;
	if (fromBottom) {
		direction = -1;
		first = lastNdx - 1;
		last = firstNdx - 1;
	} else {
		direction = 1;
		first = firstNdx;
		last = lastNdx;
	}

	var showedCount = 0;
	for (var i = first; i !== last; i += direction) {
		if (!tiles[i].prepareToShow(i, numStep)) { continue; } // was already ready to show
		showedCount++;
		if (maxUpdates && showedCount === maxUpdates) { break; }
	}
	return showedCount;
}

Room.prototype._hideAllTiles = function () {
	var tiles = this.allVisibleTiles;
	for (var i = 0; i < tiles.length; i++) {
		tiles[i].hideTile();
	}

	MountBox.hidePoolTiles(this);
};

Room.prototype._showAllTiles = function () {
	var tiles = this.allVisibleTiles;
	for (var i = 0; i < tiles.length; i++) {
		tiles[i].showTile();
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/BreedingWindow/Room.js
 ** module id = 678
 ** module chunks = 0
 **/