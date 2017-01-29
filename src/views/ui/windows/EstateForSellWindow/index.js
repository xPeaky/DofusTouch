require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var Button = require('Button').DofusButton;
var NumberInputBox = require('NumberInputBox');
var staticContent = require('staticContent');
var windowsManager = require('windowsManager');
var helper = require('helper');
var Selector = require('Selector');
var SelectorList = require('SelectorList');
var Table = require('Table');
var getText = require('getText').getText;


/**
 * @class EstateForSellWindow
 */
function EstateForSellWindow() {
	Window.call(this, {
		className: 'EstateForSellWindow',
		title: getText('ui.estate.agency'),
		positionInfo: { top: 'c', left: 'c', width: '82%', height: '94%', maxHeight: 660 }
	});

	var self = this;

	this.once('open', function () {
		self.setupContainer1();
		self.setupContainer2();
		self.setupContainer3();
	});

	this.on('open', function () {
		self.resetFilterData();
	});

	this.on('close', function () {
		self.table.clearContent();
		windowsManager.close('estateInformation');
	});

	this.setupSocketEvents();
}

inherits(EstateForSellWindow, Window);
module.exports = EstateForSellWindow;


EstateForSellWindow.prototype.setupRoomSelector = function () {
	var self = this;
	var roomOptionCount = 4;

	this.roomSelector.addOption(getText('ui.estate.filter.atLeastNbRoom'), 0);

	for (var i = 1; i <= roomOptionCount; i++) {
		this.roomSelector.addOption(getText('ui.estate.filter.nbRoom', i), i);
	}

	this.roomSelector.on('change', function (value) {
		self.houseToSellFilter.atLeastNbRoom = parseInt(value, 10);
	});
};


EstateForSellWindow.prototype.setupChestSelector = function () {
	var self = this;
	var chestOptionCount = 4;

	this.chestSelector.addOption(getText('ui.estate.filter.atLeastNbChest'), 0);

	for (var i = 1; i <= chestOptionCount; i++) {
		this.chestSelector.addOption(getText('ui.estate.filter.nbChest', i), i);
	}

	this.chestSelector.on('change', function (value) {
		self.houseToSellFilter.atLeastNbChest = parseInt(value, 10);
	});
};


EstateForSellWindow.prototype.setupMountSelector = function () {
	var self = this;
	var mountOptionCount = 20;
	var mountSkipCount = 5;

	this.mountSelector.addOption(getText('ui.estate.filter.atLeastNbMount'), 0);

	for (var i = mountSkipCount; i <= mountOptionCount; i += mountSkipCount) {
		this.mountSelector.addOption(getText('ui.estate.filter.nbMount', i), i);
	}

	this.mountSelector.on('change', function (value) {
		self.paddockToSellFilter.atLeastNbMount = parseInt(value, 10);
	});
};


EstateForSellWindow.prototype.setupBreedingSelector = function () {
	var self = this;
	var breedingOptionCount = 20;
	var breedingSkipCount = 5;

	this.breedingSelector.addOption(getText('ui.estate.filter.atLeastNbMachine'), 0);

	for (var i = breedingSkipCount; i <= breedingOptionCount; i += breedingSkipCount) {
		this.breedingSelector.addOption(getText('ui.estate.filter.nbMachine', i), i);
	}

	this.breedingSelector.on('change', function (value) {
		self.paddockToSellFilter.atLeastNbMachine = parseInt(value, 10);
	});
};


EstateForSellWindow.prototype.setupHousingAreaSelector = function () {
	var self = this;

	this.housingAreaSelector.addOption(getText('ui.estate.filter.areaRequested'), -1);

	var housingArea = SelectorList.getAreasWithHouseOrPaddock('house');
	for (var i = 0; i < housingArea.length; i++) {
		self.housingAreaSelector.addOption(housingArea[i].nameId, housingArea[i].id);
	}

	this.housingAreaSelector.on('change', function (value) {
		self.houseToSellFilter.areaId = parseInt(value, 10);
	});
};


EstateForSellWindow.prototype.setupPaddockAreaSelector = function () {
	var self = this;

	this.paddocksAreaSelector.addOption(getText('ui.estate.filter.areaRequested'), -1);

	var paddocksArea = SelectorList.getAreasWithHouseOrPaddock('paddock');
	for (var i = 0; i < paddocksArea.length; i++) {
		self.paddocksAreaSelector.addOption(paddocksArea[i].nameId, paddocksArea[i].id);
	}

	this.paddocksAreaSelector.on('change', function (value) {
		self.paddockToSellFilter.areaId = parseInt(value, 10);
	});
};


EstateForSellWindow.prototype.setupSkillSelector = function () {
	var self = this;

	this.skillSelector.addOption(getText('ui.estate.filter.skillRequested'), 0);

	SelectorList.getSkillsAvailableInHouse(function (error, skillList) {
		if (error) {
			return console.error('Failed to retrieve skill list', error);
		}

		for (var i = 0; i < skillList.length; i++) {
			self.skillSelector.addOption(skillList[i].nameId, skillList[i].id);
		}
	});

	this.skillSelector.on('change', function (value) {
		self.houseToSellFilter.skillRequested = parseInt(value, 10);
	});
};


EstateForSellWindow.prototype.changeDialogType = function (value) {
	this.dialogType = value;

	if (value === 'house') {
		this.roomSelector.show();
		this.chestSelector.show();
		this.housingAreaSelector.show();
		this.skillSelector.show();
		this.mountSelector.hide();
		this.breedingSelector.hide();
		this.paddocksAreaSelector.hide();
	} else {
		this.roomSelector.hide();
		this.chestSelector.hide();
		this.housingAreaSelector.hide();
		this.skillSelector.hide();
		this.mountSelector.show();
		this.breedingSelector.show();
		this.paddocksAreaSelector.show();
	}
};


EstateForSellWindow.prototype.setupContainer1 = function () {
	var self = this;
	var container1 = this.windowBody.createChild('div', { className: 'container1' });
	container1.createChild('div', { className: ['text', 'inline'], text: getText('ui.estate.typeChoice') });

	this.propertySelector = container1.appendChild(new Selector({ className: 'propertySelector' }));
	this.propertySelector.addOption(getText('ui.common.housesWord'), 'house');
	this.propertySelector.addOption(getText('ui.common.mountPark'), 'paddock');

	this.propertySelector.on('change', function (value) {
		self.changeDialogType(value);
		self.searchButton.emit('tap');
	});
};


EstateForSellWindow.prototype.setupContainer2 = function () {
	var self = this;

	var container2 = this.windowBody.createChild('div', { className: ['wrapper', 'container2'] });
	container2.createChild('div', { className: 'text', text: getText('ui.search.criteria') });

	var priceContainer = container2.createChild('div', { className: 'priceContainer' });
	priceContainer.createChild('div', { className: ['text', 'inline'], text: getText('ui.estate.filter.maxPrice') });

	var inputContainer = priceContainer.createChild('div', { className: 'inputContainer' });
	this.priceInput = inputContainer.appendChild(
		new NumberInputBox({ minValue: 0, title: getText('ui.estate.filter.maxPrice') }));
	inputContainer.createChild('div', { className: 'kamaUnit', text: getText('ui.common.short.kama') });

	var col1 = container2.createChild('div', { className: 'col1' });

	this.roomSelector = col1.appendChild(new Selector({ className: 'roomSelector' }));
	this.setupRoomSelector();

	this.chestSelector = col1.appendChild(new Selector({ className: 'chestsSelector' }));
	this.setupChestSelector();

	this.mountSelector = col1.appendChild(new Selector({ className: 'mountsSelector' }));
	this.setupMountSelector();

	this.breedingSelector = col1.appendChild(new Selector({ className: 'breedingSelector' }));
	this.setupBreedingSelector();

	this.housingAreaSelector = col1.appendChild(new Selector({ className: 'areaSelector' }));
	this.setupHousingAreaSelector();

	this.paddocksAreaSelector = col1.appendChild(new Selector({ className: 'areaSelector' }));
	this.setupPaddockAreaSelector();

	this.skillSelector = col1.appendChild(new Selector({ className: 'skillSelector' }));
	this.setupSkillSelector();

	this.searchButton = container2.appendChild(new Button(
		getText('ui.search.search'), { className: ['searchButton', 'inline'] }
	));

	this.searchButton.on('tap', function () {
		var price = self.priceInput.getValue();

		if (self.dialogType === 'house') {
			self.houseToSellFilter.maxPrice = price;
			window.dofus.sendMessage('HouseToSellFilterMessage', self.houseToSellFilter);
			window.dofus.sendMessage('HouseToSellListRequestMessage', { pageIndex: 1 });
			return;
		}

		self.paddockToSellFilter.maxPrice = price;
		window.dofus.sendMessage('PaddockToSellFilterMessage', self.paddockToSellFilter);
		window.dofus.sendMessage('PaddockToSellListRequestMessage', { pageIndex: 1 });
	});
};


EstateForSellWindow.prototype.setupContainer3 = function () {
	var self = this;

	var container3 = this.windowBody.createChild('div', { className: ['wrapper', 'container3'] });

	this.table = container3.appendChild(new Table({
		colIds: ['name', 'subarea', 'price', 'button'],
		headerContent: [getText('ui.common.name'), getText('ui.map.subarea'), getText('ui.common.price')]
	}));

	var navigator = container3.createChild('div', { className: 'navigator' });
	this.leftButton = navigator.appendChild(new Button('', { className: ['leftButton', 'inline'] }));
	this.pages = navigator.createChild('div', { className: ['pages', 'inline'] });
	this.rightButton = navigator.appendChild(new Button('', { className: ['rightButton', 'inline'] }));

	this.leftButton.on('tap', function () {
		var nextPageIndex = { pageIndex: self.currentPageIndex - 1 };

		if (self.dialogType === 'house') {
			window.dofus.sendMessage('HouseToSellListRequestMessage', nextPageIndex);
			return;
		}

		window.dofus.sendMessage('PaddockToSellListRequestMessage', nextPageIndex);
	});

	this.rightButton.on('tap', function () {
		var nextPageIndex = { pageIndex: self.currentPageIndex + 1 };

		if (self.dialogType === 'house') {
			window.dofus.sendMessage('HouseToSellListRequestMessage', nextPageIndex);
			return;
		}

		window.dofus.sendMessage('PaddockToSellListRequestMessage', nextPageIndex);
	});
};


function getHouseStaticData(dataList, cb) {
	var modelIds = {};
	var subAreaIds = {};
	for (var i = 0; i < dataList.length; i++) {
		modelIds[dataList[i].modelId] = true;
		subAreaIds[dataList[i].subAreaId] = true;
	}

	staticContent.getDataMap('Houses', Object.keys(modelIds), function (error, housesResult) {
		if (error) {
			return cb(error);
		}

		staticContent.getDataMap('SubAreas', Object.keys(subAreaIds), function (error, subAreasResult) {
			if (error) {
				return cb(error);
			}

			var areas = window.gui.databases.Areas;
			var results = [];

			for (var i = 0; i < dataList.length; i++) {
				var data = dataList[i];
				var subArea = subAreasResult[data.subAreaId];
				var house = housesResult[data.modelId];

				results.push({
					type: 'house',
					gfxId: house.gfxId,
					name: house.nameId,
					areaName: areas[subArea.areaId].nameId,
					price: helper.kamasToString(data.price),
					rooms: data.nbRoom,
					chests: data.nbChest,
					skillsCount: data.skillListIds.length,
					subAreaName: subArea.nameId,
					ownerName: data.ownerName,
					ownerConnected: data.ownerConnected,
					worldX: data.worldX,
					worldY: data.worldY
				});
			}

			return cb(null, results);
		});
	});
}


function getPaddockStaticData(dataList, cb) {
	var subAreaIds = {};

	for (var i = 0; i < dataList.length; i++) {
		subAreaIds[dataList[i].subAreaId] = true;
	}

	staticContent.getDataMap('SubAreas', Object.keys(subAreaIds), function (error, subAreasResult) {
		if (error) {
			return cb(error);
		}

		var results = [];
		var areas = window.gui.databases.Areas;

		for (var i = 0; i < dataList.length; i++) {
			var data = dataList[i];
			var subArea = subAreasResult[data.subAreaId];

			results.push({
				type: 'paddock',
				name: getText('ui.mount.paddockWithRoom', data.nbObject),
				areaName: areas[subArea.areaId].nameId,
				price: helper.kamasToString(data.price),
				mounts: data.nbMount,
				objects: data.nbObject,
				subAreaName: subArea.nameId,
				ownerName: data.guildOwner ? data.guildOwner : '?',
				worldX: data.worldX,
				worldY: data.worldY
			});
		}

		return cb(null, results);
	});
}


function showMoreInfo() {
	windowsManager.open('estateInformation', this.data);
}

EstateForSellWindow.prototype.updateList = function (list) {
	var self = this;
	this.table.clearContent();

	var fn = self.dialogType === 'house' ? getHouseStaticData : getPaddockStaticData;

	fn(list, function (error, results) {
		if (error) {
			return console.error('Failed to retrieve data', error);
		}

		for (var j = 0; j < results.length; j++) {
			var result = results[j];

			var infoButton = new Button('...', { name: 'infoButton' });
			infoButton.data = result;
			infoButton.on('tap', showMoreInfo);

			self.table.addRow({
				name: result.name,
				subarea: result.areaName,
				price: result.price,
				button: infoButton
			});
		}
	});
};


EstateForSellWindow.prototype.resetFilterData = function () {
	this.houseToSellFilter = {
		areaId: -1,
		atLeastNbRoom: 0,
		atLeastNbChest: 0,
		skillRequested: 0,
		maxPrice: 0
	};

	this.paddockToSellFilter = {
		areaId: -1,
		atLeastNbMount: 0,
		atLeastNbMachine: 0,
		maxPrice: 0
	};

	this.roomSelector.setValue(0);
	this.chestSelector.setValue(0);
	this.mountSelector.setValue(0);
	this.breedingSelector.setValue(0);
	this.housingAreaSelector.setValue(-1);
	this.paddocksAreaSelector.setValue(-1);
	this.skillSelector.setValue(0);
	this.priceInput.setValue(0);

	window.dofus.sendMessage('HouseToSellFilterMessage', this.houseToSellFilter);
	window.dofus.sendMessage('PaddockToSellFilterMessage', this.paddockToSellFilter);
};


EstateForSellWindow.prototype.updateDisplay = function (type, msg) {
	this.currentPageIndex = msg.pageIndex;

	if (this.currentPageIndex <= 1) {
		this.leftButton.disable();
	} else {
		this.leftButton.enable();
	}

	if (this.currentPageIndex >= msg.totalPage) {
		this.rightButton.disable();
	} else {
		this.rightButton.enable();
	}

	this.pages.setText(msg.pageIndex + '/' + msg.totalPage);

	this.propertySelector.setValue(type);
	this.changeDialogType(type);
};


EstateForSellWindow.prototype.setupSocketEvents = function () {
	var self = this;

	window.gui.on('HouseToSellListMessage', function (msg) {
		windowsManager.openDialog(self.id);
		self.updateDisplay('house', msg);
		self.updateList(msg.houseList);
	});


	window.gui.on('PaddockToSellListMessage', function (msg) {
		windowsManager.openDialog(self.id);
		self.updateDisplay('paddock', msg);
		self.updateList(msg.paddockList);
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/EstateForSellWindow/index.js
 ** module id = 719
 ** module chunks = 0
 **/