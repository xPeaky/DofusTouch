require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var WuiDom = require('wuidom');
var Button = require('Button');
var tapBehavior = require('tapBehavior');
var windowsManager = require('windowsManager');
var getText = require('getText').getText;
var helper = require('helper');
var Tabs = require('Tabs');
var Table = require('Table');
var TeleporterTypeEnum = require('TeleporterTypeEnum');

// 2 categories of subways (zaapi): CraftHouse and BidHouse

var CATEGORY_CRAFTHOUSE = 3;
var CATEGORY_BIDHOUSE = 2;

var kamaCount;
var currentMapId;
var currentSubAreaName;

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class TeleporterListWindow
 * @desc  window for list of teleporters
 */
function TeleporterListWindow() {
	Window.call(this, {
		className: 'teleporterListWindow',
		title: '_',
		positionInfo: { left: 'c', top: 'c', width: '600', height: '440' }
	});
	var self = this;

	this.parentBody = null;

	this.zaapBody = this.windowBody.createChild('div', { className: ['teleporterBody', 'zaapBody'] });
	this.subwayBody = this.windowBody.createChild('div', { className: ['teleporterBody', 'subwayBody'] });

	this.createTabs(this.zaapBody, [
		{ title: getText('ui.zaap.zaap'), name: 'Zaap' },
		{ title: getText('ui.zaap.prism'), name: 'Prism' }
	]);

	this.createTabs(this.subwayBody, [
		{ title: getText('ui.map.craftHouse'), name: 'CraftHouse' },
		{ title: getText('ui.map.bidHouse'), name: 'BidHouse' },
		{ title: getText('ui.common.misc'), name: 'Misc' }
	]);

	this.createFooter();

	/** @event module:protocol/interactiveZaap.client_ZaapListMessage */
	window.gui.on('ZaapListMessage', function (msg) {
		self.setContent(msg);
	});

	/** @event module:protocol/interactiveZaap.client_TeleportDestinationsListMessage */
	window.gui.on('TeleportDestinationsListMessage', function (msg) {
		self.setContent(msg);
	});
}
inherits(TeleporterListWindow, Window);
module.exports = TeleporterListWindow;


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method createTabs
 * @desc   Creates tabs for both Zaap and Subwau bodies

 * @param  {Object} parentBody - The WUIDom parent element (Zaap or Subway)
 * @param  {Array} tabArray - TAn object with title and name for tab and panel elements
 */
TeleporterListWindow.prototype.createTabs = function (parentBody, tabArray) {
	// Tabs container
	parentBody.tabs = new Tabs();
	parentBody.appendChild(parentBody.tabs);

	// Panels container
	parentBody.panels = parentBody.createChild('div', { className: 'panels' });
	parentBody.panelCollection = {};

	// Each panel
	for (var i = 0, len = tabArray.length; i < len; i += 1) {
		var tabName = tabArray[i].name;
		parentBody.panelCollection[tabName] = parentBody.panels.createChild('div', { className: ['panel'] });
		parentBody.tabs.addTab(tabArray[i].title, parentBody.panelCollection[tabName]);
		this.createTable(parentBody.panelCollection[tabName]);
	}
};

// TODO: componentize this?
/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method createTable
 * @desc   Creates the table element and the table headers for it
 *
 * @param  {Object} parentPanel - The WUIDom parent element
 */
TeleporterListWindow.prototype.createTable = function (parentPanel) {
	function selectDestination(row) {
		parentPanel.selectedTeleporterType = row.teleporterType;
		parentPanel.selectedMapId = row.mapId;
	}

	var destinationFormat = getText('ui.zaap.destination') + getText('ui.common.colon');
	var subareaFormat = getText('ui.common.area') + ' (' + getText('ui.common.subarea') + ')';
	parentPanel.table = parentPanel.appendChild(new Table({
		colIds: ['saved', 'destination', 'coordinates', 'cost'],
		colCount: 4,
		highlightable: true,
		headerContent: [
			'',
			destinationFormat + subareaFormat,
			getText('ui.common.coordinatesSmall'),
			getText('ui.common.cost')
		],
		onRowTap: selectDestination
	}));
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method createFooter
 * @desc   Creates the footer with the kama count in it
 */
TeleporterListWindow.prototype.createFooter = function () {
	var self = this;
	var footer = this.windowBody.createChild('div', { className: 'footer' });
	var buttonOk = footer.appendChild(new Button({ className: 'greenButton', text: getText('ui.common.validation') }));
	buttonOk.on('tap', function () {
		var currentTab = self.parentBody.tabs.getCurrentTab().target;
		window.dofus.sendMessage('TeleportRequestMessage', {
			teleporterType: currentTab.selectedTeleporterType,
			mapId: currentTab.selectedMapId
		});
	});
	this.nbKamas = footer.createChild('div', { className: 'nbKamas' });
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method setContent
 * @desc   Fills the window with the list of Zaaps
 *
 * @param  {Object} msg - contains all the teleporter info
 */
TeleporterListWindow.prototype.setContent = function (msg) {
	// Open window and set styles
	windowsManager.openDialog(this.id);
	this.setClassNames('window', 'teleporterListWindow');

	// Set kama count and current mapId
	kamaCount = window.gui.playerData.inventory.kamas;
	currentMapId = window.gui.playerData.position.mapId;
	currentSubAreaName = window.gui.playerData.position.subArea.nameId;

	switch (msg.teleporterType) {
	// Zaap or Prism
	case TeleporterTypeEnum.TELEPORTER_ZAAP:
	case TeleporterTypeEnum.TELEPORTER_PRISM:
		this.setupZaapBody(msg);
		break;

	// Zaapi
	case TeleporterTypeEnum.TELEPORTER_SUBWAY:
		this.setupSubwayBody(msg);
		break;

	default:
		break;
	}

	// Set kama amount
	this.nbKamas.setText(helper.kamasToString(kamaCount, '')); //'' passed because "K" is an image here
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method setupZaapBody
 * @desc   prepares the zaap body
 * @param  {Object} msg - The message
 */
TeleporterListWindow.prototype.setupZaapBody = function (msg) {
	var i;
	var panel;

	// Current zaap is the window title
	var teleporterTypeTitle;
	if (msg.teleporterType === TeleporterTypeEnum.TELEPORTER_ZAAP) {
		teleporterTypeTitle = getText('ui.zaap.zaap');
	} else {
		teleporterTypeTitle = getText('ui.zaap.prism');
	}

	this.windowTitle.setText(teleporterTypeTitle + ' - ' + currentSubAreaName);
	if (currentMapId === msg.spawnMapId) {
		this.windowTitle.addClassNames('saved');
	} else {
		this.windowTitle.delClassNames('saved');
	}
	this.parentBody = this.zaapBody;
	this.zaapBody.show();
	this.subwayBody.hide();

	// Clean all table contents
	for (i in this.zaapBody.panelCollection) {
		panel = this.zaapBody.panelCollection[i];
		if (panel.table) {
			panel.table.clearContent();
		}
	}

	// Fill content with zaaps
	var teleporterCount = msg._subAreas.length;

	// build array of teleporter objects
	var teleporters = [];
	for (i = 0; i < teleporterCount; i += 1) {
		var subArea = msg._subAreas[i];
		var map = msg._maps[i];
		var teleporterType = msg.destTeleporterType[i];

		teleporters.push({
			name: subArea.areaName + ' (' + subArea.name + ')',
			type: teleporterType,
			posX: map.posX,
			posY: map.posY,
			mapId: map.id,
			teleporterCost: msg.costs[i],
			saved: map.id === msg.spawnMapId
		});
	}

	// Sort Teleporters alphabetically
	teleporters.sort(function (a, b) {
		return (a.name > b.name) ? 1 : -1;
	});

	// Fill content with zaaps
	for (i = 0; i < teleporterCount; i += 1) {
		var teleporter = teleporters[i];

		// Don't show current teleporter
		var zaapTypeIsZaapOrPrism = (
			teleporter.type === TeleporterTypeEnum.TELEPORTER_ZAAP ||
			teleporter.type === TeleporterTypeEnum.TELEPORTER_PRISM
			);

		if (teleporter.mapId !== currentMapId && zaapTypeIsZaapOrPrism) {
			var parentPanel;

			if (teleporter.type === TeleporterTypeEnum.TELEPORTER_ZAAP) {
				parentPanel = this.zaapBody.panelCollection.Zaap;
			}

			if (teleporter.type === TeleporterTypeEnum.TELEPORTER_PRISM) {
				parentPanel = this.zaapBody.panelCollection.Prism;
			}

			this.addTeleporter({
				parentPanel: parentPanel,
				teleporterType: teleporter.type,
				destinationName: teleporter.name,
				posX: teleporter.posX,
				posY: teleporter.posY,
				mapId: teleporter.mapId,
				teleporterCost: teleporter.teleporterCost,
				saved: teleporter.saved
			});
		}
	}

	this.setupTabs();
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method setupSubwayBody
 * @desc   prepares the subway body
 * @param  {Object} msg - The message
 */
TeleporterListWindow.prototype.setupSubwayBody = function (msg) {
	var i;
	var panel;
	var teleporter;

	this.windowTitle.setText(getText('ui.zaap.zaapi') + ' - ' + currentSubAreaName);
	if (currentMapId === msg.spawnMapId) {
		this.windowTitle.addClassNames('saved');
	} else {
		this.windowTitle.delClassNames('saved');
	}
	this.parentBody = this.subwayBody;
	this.zaapBody.hide();
	this.subwayBody.show();

	// Clean all table contents
	for (i in this.subwayBody.panelCollection) {
		panel = this.subwayBody.panelCollection[i];
		if (panel.table) {
			panel.table.clearContent();
		}
	}

	var teleporterCount = msg._hints.length;

	// build array of teleporter objects
	var teleporters = [];
	for (i = 0; i < teleporterCount; i += 1) {
		teleporter = msg._hints[i];
		teleporters.push({
			name: teleporter.nameId,
			category: teleporter.categoryId,
			posX: teleporter.x,
			posY: teleporter.y,
			mapId: teleporter.mapId,
			teleporterCost: teleporter.teleporterCost,
			saved: teleporter.mapId === msg.spawnMapId
		});
	}

	// Sort Teleporters alphabetically
	teleporters.sort(function (a, b) {
		return (a.name > b.name) ? 1 : -1;
	});

	// Fill content with zaapis
	for (i = 0; i < teleporterCount; i += 1) {
		teleporter = teleporters[i];
		// Don't show current teleporter
		if (teleporter.mapId !== currentMapId) {
			var parentPanel;

			// find category for zaapi
			if (teleporter.category === CATEGORY_CRAFTHOUSE) {
				parentPanel = this.subwayBody.panelCollection.CraftHouse;
			} else if (teleporter.category === CATEGORY_BIDHOUSE) {
				parentPanel = this.subwayBody.panelCollection.BidHouse;
			} else {
				parentPanel = this.subwayBody.panelCollection.Misc;
			}

			// add the zaapi to the correct tab
			this.addTeleporter({
				parentPanel: parentPanel,
				teleporterType: TeleporterTypeEnum.TELEPORTER_SUBWAY,
				destinationName: teleporter.name,
				posX: teleporter.posX,
				posY: teleporter.posY,
				mapId: teleporter.mapId,
				teleporterCost: teleporter.teleporterCost,
				saved: teleporter.saved
			});
		}
	}

	this.setupTabs();
};


/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method addTeleporter
 * @desc   Adds a zaap to the list of Zaaps
 *
 * @param  {Object} params - params
 * @param  {string} params.destinationName - destination name
 * @param  {number} params.teleporterCost - cost info for that teleporter
 * @param  {number} params.parentPanel - panel to add the teleporter to
 * @param  {number} params.posX - X pos of map
 * @param  {number} params.posY - Y pos of map
 * @param  {number} params.teleporterType - Teleporter type: zaap, subway, prism
 * @param  {number} params.mapId - map Id
 */
TeleporterListWindow.prototype.addTeleporter = function (params) {
	var destinationCell = new WuiDom('div');
	destinationCell.createChild('div', { className: 'destinationName', text: params.destinationName });
	var btnMapLocation = destinationCell.appendChild(new Button({ className: 'btnMapLocation' }));

	var teleporterCost = params.teleporterCost;

	var row = params.parentPanel.table.addRow({
		saved: (params.saved) ? new WuiDom('div', { className: 'saved' }) : '',
		destination: destinationCell,
		coordinates: params.posX + ',' + params.posY,
		cost: helper.kamasToString(teleporterCost)
	}, {
		teleporterType: params.teleporterType,
		mapId: params.mapId
	});

	tapBehavior(btnMapLocation);

	// if not enough gold, disable that zaap
	if (kamaCount < teleporterCost) {
		row.addClassNames('disabled');
	}

	btnMapLocation.on('tap', function () {
		window.gui.emit('CompassUpdateMessage', {
			type: 'zaap',
			worldX: params.posX,
			worldY: params.posY
		});
		windowsManager.open('worldMap', { x: params.posX, y: params.posY });
	});
};

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method setupTabs
 * @desc   opens the leftmost one and disable the empty ones
 */
TeleporterListWindow.prototype.setupTabs = function () {
	var tabs = this.parentBody.tabs;
	var tabsMap = tabs.getTabsMap();
	var openTab = false;

	for (var id in tabsMap) {
		var tabObj = tabsMap[id];

		// if no teleporter in that list, disable its tab
		if (tabObj.target.table.getRows().length <= 0) {
			tabObj.tab.disable();
			continue;
		}

		tabObj.tab.enable();
		if (!openTab) {
			// open the leftmost non-empty tab
			tabs.openFirstTab();
			openTab = true;
		}
	}

	// If all the tabs are empty, still activate / open the first one
	if (!openTab) {
		var firstTabObj = tabs.getFirstTab();
		firstTabObj.tab.enable();
		tabs.openFirstTab();
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/TeleporterListWindow/index.js
 ** module id = 809
 ** module chunks = 0
 **/