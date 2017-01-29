var windowsManager = require('windowsManager');

exports.pointToWindowCloseButton = function (windowId) {
	var windowElm = windowsManager.getWindow(windowId);

	if (!windowElm.openState) {
		return;
	}

	var rootElement = windowElm.closeButton.rootElement;
	var rect = rootElement.getBoundingClientRect();
	var x, y;

	x = rect.left + (rect.width / 2);
	y = rect.top + (rect.height / 2);

	window.gui.hintArrow.showArrow(x, y, 'upRight');
};

exports.pointToMenuIcon = function (name) {
	var icon = window.gui.menuBar.getIcon(name);
	var rootElement = icon.rootElement;
	var rect = rootElement.getBoundingClientRect();
	var x = rect.left + 10;
	var y = rect.top + 10;

	window.gui.hintArrow.showArrow(x, y, 'downRight');
};

exports.pointToNpcAnswer = function (replyNumber) {
	var npcDialog = window.gui.npcDialogUi;
	if (!npcDialog.isVisible()) { return; }
	var target = npcDialog.replyElts[replyNumber];
	if (!target) { return; }

	var rootElement = target.rootElement;
	var rect = rootElement.getBoundingClientRect();
	var x = rect.left + Math.round(rect.width * 0.3);
	var y = rect.top + Math.round(rect.height * 0.3);
	window.gui.hintArrow.showArrow(x, y, 'downRight');
};

// type can be 'fightReadyBtn' or 'turnReadyBtn'
exports.pointToTimelineButton = function (type) {
	var fightControlButtons = window.gui.timeline.fightControlButtons;
	var rect = fightControlButtons.getButtonRectForTuto(type);
	if (!rect) { return; }

	var x = rect.left + Math.round(rect.width * 0.5);
	var y = rect.top + Math.round(rect.height * 0.3);
	window.gui.hintArrow.showArrow(x, y, 'upLeft');
};

exports.pointToFirstSkillShortcut = function () {
	var shortcutBar = window.gui.shortcutBar;
	shortcutBar.openPanel('spell');

	var firstSlot = shortcutBar.getSlot('spell', 0);
	var rootElement = firstSlot.rootElement;
	var rect = rootElement.getBoundingClientRect();
	var x = rect.left + 25;
	var y = rect.top + 25;
	window.gui.hintArrow.showArrow(x, y, 'downRight');
};

var EQUIPMENT_FILTER_ID = 0;

exports.pointToEquipFilterIcon = function () {
	var equipmentWindow = windowsManager.getWindow('equipment');
	if (!equipmentWindow.openState) {
		return;
	}
	var storageView = equipmentWindow.storageView;
	var filter = storageView.filter;
	var filterBtnMap = filter.filterBtnMap;
	var elm = filterBtnMap[EQUIPMENT_FILTER_ID];

	var rootElement = elm.rootElement;
	var rect = rootElement.getBoundingClientRect();
	var x = rect.left + Math.round(rect.width * 0.5);
	var y = rect.top + Math.round(rect.height * 0.5);

	window.gui.hintArrow.showArrow(x, y, 'upLeft');
};

exports.pointToCharacterItem = function (position) {
	var equipmentWindow = windowsManager.getWindow('equipment');
	if (!equipmentWindow.openState) {
		return;
	}
	var slots = equipmentWindow.getEquipmentSlots();
	var slot = slots[position];

	var rootElement = slot.rootElement;
	var rect = rootElement.getBoundingClientRect();
	var x = rect.left + (rect.width / 2);
	var y = rect.top + (rect.height / 2);

	window.gui.hintArrow.showArrow(x, y, 'upLeft');
};

exports.pointToStorageFirstSlotBox = function () {
	var equipmentWindow = windowsManager.getWindow('equipment');
	if (!equipmentWindow.openState) {
		return;
	}
	var storageView = equipmentWindow.storageView;
	var rootElement = storageView.slotsContainer.rootElement;
	var rect = rootElement.getBoundingClientRect();
	var x = rect.left + 10;
	var y = rect.top + 10;

	window.gui.hintArrow.showArrow(x, y, 'downRight');
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/hintArrowHelper/index.js
 ** module id = 451
 ** module chunks = 0
 **/