require('./styles.less');
var inherits = require('util').inherits;
var ContextualMenu = require('contextualMenus/ContextualMenu');
var getText = require('getText').getText;
var windowsManager = require('windowsManager');
var WorldMapTooltip = require('WorldMapTooltip');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @class */
function ContextualMenuMap() {
	ContextualMenu.call(this);

	var teleport, removeZaap, removeQuest, removeHint, placeFlag, removeFlag;
	var openingParams;

	this.worldMapTooltip = new WorldMapTooltip();

	this.once('open', function () {
		this.header.setText(getText('ui.cartography.title'));
		var worldMapWindow = windowsManager.getWindow('worldMap');

		var GPS = window.gui.GPS;

		this.worldMapTooltip.addClassNames('worldMapTooltip');
		this.entryList.appendChild(this.worldMapTooltip);
		this._addSeparator();

		teleport = this._addEntry(getText('ui.common.teleport'), function () {
			window.dofus.sendMessage('AdminQuietCommandMessage', {
				content: 'move * ' + openingParams.i + ',' + openingParams.j
			});
			if (worldMapWindow.isFullScreen) {
				windowsManager.close('worldMap');
			}
		});

		placeFlag = this._addEntry(getText('ui.map.flag'), function () {
			GPS.addCustomFlag(openingParams.i, openingParams.j);
		});

		removeFlag = this._addEntry(getText('ui.common.remove'), function () {
			GPS.removeCustomFlag(openingParams.i, openingParams.j);
		});

		removeZaap = this._addEntry(getText('ui.common.remove') + ' [' + getText('ui.zaap.zaap') + ']', function () {
			GPS.removePOI(this.flagId);
		});

		removeQuest = this._addEntry(getText('ui.common.remove') + ' [' + getText('ui.common.quests') + ']', function () {
			GPS.removePOI(this.flagId);
		});

		removeHint = this._addEntry(getText('ui.common.remove') +
			' [' + getText('ui.map.flagDefaultName') + ']', function () {
			GPS.removePOI(this.flagId);
		});

		this._addCancel();
	});

	this.on('open', function (params, contentReady) {
		openingParams = params;

		placeFlag.show();
		removeFlag.hide();
		removeQuest.hide();
		removeZaap.hide();
		removeHint.hide();

		var icons = params.icons;
		if (icons) {
			for (var i = 0, len = icons.length; i < len; i += 1) {
				var icon = icons[i];
				if (icon.categoryId === 'customFlag') {
					removeFlag.show();
					placeFlag.hide();
				} else if (icon.categoryId === 'questObjective') {
					removeQuest.flagId = icon.id;
					removeQuest.show();
				} else if (icon.categoryId === 'zaap') {
					removeZaap.flagId = icon.id;
					removeZaap.show();
				} else if (icon.categoryId === 'hint') {
					removeHint.flagId = icon.id;
					removeHint.show();
				}
			}
		}

		// Moderator or more can teleport
		teleport.toggleDisplay(window.gui.playerData.isModeratorOrMore());
		contentReady();
	});
}

inherits(ContextualMenuMap, ContextualMenu);
module.exports = ContextualMenuMap;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuMap/index.js
 ** module id = 406
 ** module chunks = 0
 **/