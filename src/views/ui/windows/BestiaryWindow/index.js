require('./styles.less');
var inherits = require('util').inherits;
var Tabs = require('Tabs');
var WuiDom = require('wuidom');
var staticContent = require('staticContent');
var List = require('List');
var ListV2 = require('ListV2').SingleSelectionList;
var itemManager = require('itemManager');
var ItemSlot = require('ItemSlot');
var getText = require('getText').getText;
var assetPreloading = require('assetPreloading');
var playUiSound = require('audioManager').playUiSound;
var helper = require('helper');
var SearchBox = require('SearchBox');
var tooltip = require('TooltipBox');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @function sortByNameId
 * @desc     Sort function for string elements.
 * @private
 *
 * @param {String} a - first element
 * @param {String} b - second element
 * @return {Number} alphabetical precedence.
 */
function sortByNameId(a, b) {
	if (a.nameId < b.nameId) {
		return -1;
	}
	if (a.nameId > b.nameId) {
		return 1;
	}
	return 0;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @class   BestiaryWindow
 * @extends Window
 */
function BestiaryWindow() {
	WuiDom.call(this, 'div', { className: 'BestiaryWindow', name: 'bestiary' });
	var self = this;

	this.subAreas = {};

	this.monsters = {};

	// layout
	this.col1 = this.createChild('div', { className: 'col1' });
	this.col2 = this.createChild('div', { className: 'col2' });


	// tabs
	this.tabs = new Tabs();
	this.col1.appendChild(this.tabs);
	this.panels = this.col1.createChild('div', { className: 'panels' });

	var panelAreas = this.panels.createChild('div', { className: 'panel' });
	var areaList = this.areaList = panelAreas.appendChild(new List());
	areaList.addClassNames('tree');

	areaList.on('activate', function (item) {
		item.sublist.show();
		playUiSound('TAB');
	});
	areaList.on('deactivate', function (item) {
		item.sublist.hide();
		item.sublist.deactivate();
	});

	var panelFamilies = this.panels.createChild('div', { className: 'panel' });
	var superRaceList = panelFamilies.appendChild(new List());
	superRaceList.addClassNames('tree');

	superRaceList.on('activate', function (item) {
		item.sublist.show();
		playUiSound('TAB');
	});
	superRaceList.on('deactivate', function (item) {
		item.sublist.hide();
		item.sublist.deactivate();
	});

	this.searchBlock = this.col2.createChild('div', { className: 'searchBlock' });
	this.searchBox = this.searchBlock.appendChild(new SearchBox());
	this.searchBox.on('search', function (searchText) {
		self._search(searchText);
	});

	this.monsterList = this.col2.appendChild(new ListV2());

	this.monsterList.on('selected', function (item) {
		if (!item.more) {
			self._createMonsterMoreInfo(item);
		} else {
			item.more.show();
			this.refresh();
		}
	});

	this.monsterList.on('deselected', function (item) {
		item.more.hide();
		this.refresh();
	});

	this.noResultText = this.monsterList.createChild('div',
		{
			className: 'noResultText',
			text: getText('ui.search.noResult')
		}
	);

	this.errorText = this.monsterList.createChild('div',
		{
			className: 'errorText',
			text: getText('ui.secureMode.error.default')
		}
	);
	self.errorText.hide();

	this.tabs.addTab(getText('ui.monster.areas'), panelAreas);
	this.tabs.addTab(getText('ui.monster.families'), panelFamilies);
	this.tabs.openTab(0);

	function onOpen(params) {
		if (params.search) {
			self._search(params.search);
		}
	}

	this.once('open', function (params) {
		staticContent.getAllDataBulk(['Areas', 'SubAreas', 'MonsterSuperRaces', 'MonsterRaces'], function (error, results) {
			if (error) {
				return console.error('Bestiary: getAllDataAreas error', error);
			}

			var areas = results.Areas;
			var subAreas = results.SubAreas;
			var monsterSuperRaces = results.MonsterSuperRaces;
			var monsterRaces = results.MonsterRaces;

			// areas
			areas.sort(sortByNameId);
			areas.forEach(function (area) {
				self.addToList(areaList, area);
			});

			// subAreas
			subAreas.sort(sortByNameId);
			subAreas.forEach(function (subArea) {
				if (subArea.monsters.length > 0) {
					var label = new WuiDom('div', { className: 'label', text: subArea.nameId });
					areaList.items[subArea.areaId].sublist.addItem(subArea.id, label, subArea);
					self.subAreas[subArea.id] = subArea;
				}
			});

			// monsterSuperRaces
			monsterSuperRaces.sort(sortByNameId);
			monsterSuperRaces.forEach(function (monsterSuperRace) {
				self.addToList(superRaceList, monsterSuperRace);
			});

			// monsterRaces
			monsterRaces.sort(sortByNameId);
			monsterRaces.forEach(function (monsterRace) {
				if (monsterRace.monsters.length > 0) {
					var label = new WuiDom('div', { className: 'label', text: monsterRace.nameId });
					superRaceList.items[monsterRace.superRaceId].sublist.addItem(monsterRace.id, label, monsterRace);
				}
			});

			self.on('open', onOpen);

			onOpen(params);
		});
	});
}
inherits(BestiaryWindow, WuiDom);
module.exports = BestiaryWindow;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @param {Object[]} list -
 * @param {Object}   data -
 */
BestiaryWindow.prototype.addToList = function (list, data) {
	var self = this;
	var label = new WuiDom('div', { className: 'label' });
	label.createChild('div', { className: 'arrow' });
	label.createChild('div', { className: 'text', text: data.nameId });

	var li = list.addItem(data.id, label, data);
	li.sublist = li.appendChild(new List());
	li.sublist.addClassNames('tree');
	li.sublist.hide();
	li.sublist.on('activate', function (item) {
		self._showMonsters(item.data.monsters);
	});
};

BestiaryWindow.prototype._search = function (searchText) {
	var self = this;
	this.searchBox.setValue(searchText);

	if (searchText === null || searchText === '') { return this._cancelSearch(true); }
	if (searchText.length < 3) {
		return tooltip.showNotification(getText('ui.common.searchFilterTooltip'), this.searchBox);
	}
	searchText = helper.simplifyString(searchText);
	this.searching = true;

	this.monsterList.clearContent();
	this.monsterList.addClassNames('spinner');
	self.errorText.hide();
	self.noResultText.hide();

	// look for drops
	staticContent.searchDataMap('Items', { match: searchText }, function (error, items) {
		if (error) {
			self.monsterList.delClassNames('spinner');
			self.errorText.show();
			return console.error('BestiaryWindow items search', error);
		}

		var dropMonsterIds = [];
		for (var id in items) {
			var item = items[id];
			if (item.dropMonsterIds.length) {
				for (var i = 0; i < item.dropMonsterIds.length; i++) {
					var dropId = item.dropMonsterIds[i];
					if (dropMonsterIds.indexOf(dropId) === -1) {
						dropMonsterIds.push(dropId);
					}
				}
			}
		}

		// look for monster name
		staticContent.searchDataMap('Monsters', { match: searchText }, function (error, monsters) {
			if (error) {
				self.monsterList.delClassNames('spinner');
				self.errorText.show();
				return console.error('BestiaryWindow monsters search', error);
			}

			for (var id in monsters) {
				var monster = monsters[id];
				if (dropMonsterIds.indexOf(monster.id) === -1) {
					dropMonsterIds.push(monster.id);
				}
			}

			if (self.searching) {
				self._showMonsters(dropMonsterIds);
			}
		});
	});
};

BestiaryWindow.prototype._showMonsters = function (monsterIds) {
	var self = this;
	this.searching = false;
	self.errorText.hide();
	self.noResultText.hide();
	staticContent.getData('Monsters', monsterIds, function (error, monsters) {
		if (error) {
			self.monsterList.delClassNames('spinner');
			self.errorText.show();
			return console.error('BestiaryWindow showMonsters error', error);
		}
		monsters.sort(sortByNameId);
		self.monsterList.clearContent();
		self.monsterList.delClassNames('spinner');
		var images = [];
		var len = monsters.length;
		if (len === 0) {
			self.noResultText.show();
		}

		for (var i = 0; i < len; i += 1) {
			images.push('gfx/monsters/' + monsters[i].id + '.png');
		}
		assetPreloading.preloadImages(images, function (urls) {
			for (var i = 0; i < len; i += 1) {
				self.addMonster(monsters[i], urls[i]);
			}
			self.monsterList.refresh();
		});
	});
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/**
 * @method addMonster
 * @desc   Adding a monster in right hand side list of window.
 *
 * @param {Object} monsterData - data of monster to add
 * @param {Object} imageUri    - monster image url (uri if native)
 */
BestiaryWindow.prototype.addMonster = function (monsterData, imageUri) {
	var infos = new WuiDom('div', { className: 'infos' });
	var gfx = infos.createChild('div', { className: 'gfx' });
	gfx.setStyle('backgroundImage', imageUri);
	var infosGroupRight = infos.createChild('div', { className: 'infosGroupRight' });
	var infosGroupTitle = infosGroupRight.createChild('div', { className: 'cf' });
	var monsterClass = ['name'];
	if (monsterData.isBoss) {
		monsterClass.push('boss');
	}
	if (monsterData.isMiniBoss) {
		monsterClass.push('miniBoss');
	}
	if (monsterData.isQuestMonster) {
		monsterClass.push('questMonster');
	}


	var isModeratorOrMore = window.gui.playerData.isModeratorOrMore();

	var monsterName = monsterData.nameId;
	if (isModeratorOrMore) {
		monsterName += ' (' + monsterData.id + ')';
	}
	infosGroupTitle.createChild('div', {
		className: monsterClass,
		text: monsterName
	});
	var lvlMin = monsterData.grades[0].level;
	var lvlMax = monsterData.grades[monsterData.grades.length - 1].level;
	var lvlTxt = getText('ui.common.short.level') + ' ' + lvlMin;
	if (lvlMin !== lvlMax) {
		lvlTxt += ' ' + getText('ui.chat.to') + ' ' + lvlMax;
	}
	infosGroupTitle.createChild('div', { className: 'level', text: lvlTxt });

	if (monsterData.favoriteSubareaId !== 0) {
		var subAreaName = this.subAreas[monsterData.favoriteSubareaId].nameId;
		var areaName = this.areaList.items[this.subAreas[monsterData.favoriteSubareaId].areaId].data.nameId;
		infosGroupRight.createChild('div', {
			className: 'favoriteSubarea',
			text: subAreaName + ' (' + areaName + ')'
		});
	}

	var li = this.monsterList.addItem({ id: monsterData.id, element: infos, data: monsterData }, { noRefresh: true });
	li.addClassNames('monster');
	li.monsterData = monsterData;
};

/** Create "more info" part on Monster */
BestiaryWindow.prototype._createMonsterMoreInfo = function (li) {
	li.more = li.createChild('div', { className: 'more' });

	var moreGroup = li.more.createChild('div', { className: 'cf' });
	var monsterData = li.monsterData;

	function addStat(label, stat) {
		var statMin = monsterData.grades[0][stat];
		var statMax = monsterData.grades[monsterData.grades.length - 1][stat];
		var statTxt = label + ': ' + statMin;
		if (statMin !== statMax) {
			statTxt += ' ' + getText('ui.chat.to') + ' ' + statMax;
		}
		colLeft.createChild('div', { className: 'stat', text: statTxt });
	}

	var colLeft = moreGroup.createChild('div', { className: ['col', 'colLeft'] });
	colLeft.createChild('div', { className: 'subtitle', text: getText('ui.common.caracteristics') });
	addStat(getText('ui.short.lifePoints'), 'lifePoints');
	addStat(getText('ui.short.actionPoints'), 'actionPoints');
	addStat(getText('ui.short.movementPoints'), 'movementPoints');

	function addResistance(stat) {
		var statMin = monsterData.grades[0][stat];
		var statMax = monsterData.grades[monsterData.grades.length - 1][stat];
		var statTxt = statMin;
		if (statMin !== statMax) {
			statTxt += ' ' + getText('ui.chat.to') + ' ' + statMax;
		}
		colRight.createChild('div', { className: ['stat', 'resistance', stat], text: statTxt });
	}

	var colRight = moreGroup.createChild('div', { className: ['col', 'colRight'] });
	colRight.createChild('div', { className: 'subtitle', text: getText('ui.common.resistances') });
	addResistance('neutralResistance');
	addResistance('earthResistance');
	addResistance('fireResistance');
	addResistance('waterResistance');
	addResistance('airResistance');

	this._createMonsterDrops(li, monsterData.drops);
};

function getTotalStat(stat) {
	return stat.base + stat.alignGiftBonus + stat.objectsAndMountBonus + stat.contextModif;
}

function getStringFromValues(valueA, valueB) {
	if (valueA === valueB) {
		return valueA;
	} else {
		return valueA + ' ' + getText('ui.chat.to') + ' ' + valueB;
	}
}

function tooltipInfos() {
	// 'this' is itemSlot
	var tooltipText = this.data.nameId;

	var averagePriceText = getText('ui.item.averageprice') + ' : ';
	var averagePrice = this.itemDataElement.getProperty('averagePrice');
	if (averagePrice === -1) {
		averagePriceText += getText('ui.item.averageprice.unavailable');
	} else {
		averagePriceText += helper.kamasToString(averagePrice);
	}
	tooltipText += '\n' + averagePriceText;

	var myPp = getTotalStat(window.gui.playerData.characters.mainCharacter.characteristics.prospecting);
	var myTruePp = myPp;
	if (myTruePp < 100) {
		myPp = 100;
	}

	var percentDrop1 = Math.round(this.dropInfo.percentDropForGrade1 * 100) / 100;
	var percentDropn = Math.round(this.dropInfo.percentDropForGrade5 * 100) / 100;
	var myPercentDrop1 = percentDrop1 * myPp / 100;
	var myPercentDropn = percentDropn * myPp / 100;
	if (myPercentDrop1 > 100) {
		myPercentDrop1 = 100;
	}
	if (myPercentDropn > 100) {
		myPercentDropn = 100;
	}

	tooltipText += '\n' + getText('ui.monster.obtaining');
	tooltipText += ' (' + myTruePp + ' ' + getText('ui.short.prospection') + ') : ';
	tooltipText += getStringFromValues(myPercentDrop1, myPercentDropn) + '%';

	tooltipText += '\n' + getText('ui.monster.obtaining');
	tooltipText += ' (' + getText('ui.common.base') + ') : ';
	tooltipText += getStringFromValues(percentDrop1, percentDropn) + '%';

	if (this.dropInfo.findCeil) {
		tooltipText += '\n' + getText('ui.monster.prospectionThreshold') + ' : ' + this.dropInfo.findCeil;
	}

	return tooltipText;
}

/** Create "more info" part on Monster */
BestiaryWindow.prototype._createMonsterDrops = function (li, drops) {
	if (drops.length === 0) {
		return;
	}

	li.more.createChild('div', { className: 'subtitle', text: getText('ui.common.loot') });
	this.monsterList.refresh();

	// remove items with criteria
	//TODO: do we need to interpret criteria ?
	for (var i = drops.length - 1; i >= 0; i--) {
		var drop = drops[i];
		if (drop.hasCriteria) {
			drops.splice(i, 1);
		}
	}

	var itemIds = drops.map(function (drop) { return drop.objectId; });

	var self = this;
	itemManager.getItems(itemIds, function (error) {
		if (error) {
			return console.error('Failed to get items', error);
		}

		for (var i = 0; i < itemIds.length; i += 1) {
			var id = itemIds[i];
			var itemDataElement = itemManager.items[id];
			if (!itemDataElement) { // this is necessary when database has wrong data
				console.warn('monster', li.monsterData.id, 'contains invalid drop item in pos ', i);
				continue;
			}

			var itemSlot = li.more.appendChild(new ItemSlot());

			itemSlot.itemDataElement = itemDataElement;
			itemSlot.dropInfo = drops[i];
			itemSlot.setTooltip(tooltipInfos);

			//background and image
			itemSlot.toggleClassName('special', drops[i].hasCriteria);
			itemSlot.setItem(itemDataElement);
			itemSlot.setContextMenu('item', {
				item: itemDataElement
			});

			//frame to highlight rare items
			if (drops[i].percentDropForGrade1 < 2) {
				itemSlot.addClassNames('rareDrop'); //% is hardcoded in Ankama's code too
			} else if (drops[i].percentDropForGrade1 < 10) {
				itemSlot.addClassNames('okDrop');
			}
		}

		self.monsterList.refresh();
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/BestiaryWindow/index.js
 ** module id = 743
 ** module chunks = 0
 **/