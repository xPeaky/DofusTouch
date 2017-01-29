var getTouch = require('tapHelper').getPosition;

var menus = {
	fightTeam: require('contextualMenus/ContextualMenuFightTeam'),
	generic: require('contextualMenus/ContextualMenuGeneric'),
	interactive:  require('contextualMenus/ContextualMenuInteractive'),
	item:  require('contextualMenus/ContextualMenuItem'),
	map: require('contextualMenus/ContextualMenuMap'),
	monster: require('contextualMenus/ContextualMenuMonster'),
	npc: require('contextualMenus/ContextualMenuNpc'),
	offlinePlayer: require('contextualMenus/ContextualMenuOfflinePlayer'),
	partyOptions: require('contextualMenus/ContextualMenuPartyOptions'),
	player: require('contextualMenus/ContextualMenuPlayer'),
	preset: require('contextualMenus/ContextualMenuPreset'),
	prism: require('contextualMenus/ContextualMenuPrism'),
	storage: require('contextualMenus/ContextualMenuStorage'),
	spell: require('contextualMenus/ContextualMenuSpell'),
	spellUpgrade: require('contextualMenus/ContextualMenuSpellUpgrade'),
	taxCollector: require('contextualMenus/ContextualMenuTaxCollector'),
	userStatus: require('contextualMenus/ContextualMenuUserStatus'),
	paddockObject: require('contextualMenus/ContextualMenuPaddockObject')
};

var menuWasTouched;
var current = null;
var touch = { x: 0, y: 0 };

function registerTouch() {
	menuWasTouched = true;
}

var lastTarget, lastX, lastY, forceClosed;

function menuClosed(reason) {
	current = null;
	forceClosed = reason === 'clickAway';
}

exports.getContextMenu = function (menuId) {
	return menus[menuId];
};

exports.initialize = function (container, wBody) {
	wBody.on('dom.touchstart', function (e) {
		touch = getTouch(e);

		if (!current) {
			forceClosed = false;
			return;
		}

		if (menuWasTouched) {
			menuWasTouched = false;
		} else {
			current.close('clickAway');
		}
	});

	for (var key in menus) {
		var Menu = menus[key];
		var menu = menus[key] = container.appendChild(new Menu());
		menu.allowDomEvents();
		menu.on('dom.touchstart', registerTouch);
		menu.on('close', menuClosed);
	}
};

function setCurrent(menuId, samePosition) {
	menuId = menuId || 'generic';

	var menu  = menus[menuId];
	if (!menu) {
		console.error('Contextual menu "' + menuId + '" does not exist.');
		return false;
	}

	if (samePosition && forceClosed) {
		lastTarget = null;
		lastX = lastY = -1;
		return false;
	}

	current = menu;
	return true;
}

exports.openAt = function (menuId, x, y, params) {
	if (!setCurrent(menuId, (Math.abs(lastX - x) < 5 && Math.abs(lastY - y) < 5))) {
		return;
	}

	lastX = x;
	lastY = y;
	x = x === undefined ? touch.x : x;
	y = y === undefined ? touch.y : y;
	current.openAt(x, y, params);
};

exports.openAround = function (menuId, wuiDom, params) {
	if (!setCurrent(menuId, wuiDom === lastTarget)) {
		return;
	}

	lastTarget = wuiDom;
	current.openAround(wuiDom, params);
};

exports.close = function (params) {
	if (!current) {
		return;
	}
	current.close(params);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/index.js
 ** module id = 295
 ** module chunks = 0
 **/