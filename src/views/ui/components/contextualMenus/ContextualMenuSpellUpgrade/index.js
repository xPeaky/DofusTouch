require('./styles.less');
var ContextualMenu = require('contextualMenus/ContextualMenu');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var WuiDom = require('wuidom');
var tapBehavior = require('tapBehavior');


function ContextualMenuSpellUpgrade() {
	ContextualMenu.call(this, { className: 'ContextualMenuSpellUpgrade' });

	var levelList = [];
	var listContainer;
	var spellId, spellName;

	function requestSpellUpgrade() {
		var self = this; // "this" is a levelButton - actually a menu option!
		this.menu.close();
		window.gui.openConfirmPopup({
			title: getText('ui.grimoire.spellLevel.increase'),
			message: getText('ui.grimoire.popup.confirmation', this.upgradeCost, spellName, this.spellLevel),
			cb: function (accepted) {
				if (!accepted) { return; }

				window.dofus.sendMessage('SpellUpgradeRequestMessage', {
					spellId: spellId,
					spellLevel: self.spellLevel
				});
			}
		});
	}

	function createButton(menu) {
		var button = new WuiDom('li');
		button.menu = menu;
		tapBehavior(button);

		button.on('tap', requestSpellUpgrade);

		return button;
	}

	this.once('open', function () {
		this.header.setText(getText('ui.grimoire.spellLevel.increase'));

		listContainer = this.entryList.createChild('ul');

		this._addCancel();
	});

	this.on('open', function (params, contentReady) {
		var spellInstance = params.spell;
		spellId = spellInstance.id;
		spellName = spellInstance.getName();
		var spellLevels = spellInstance.getProperty('spellLevels');

		// The Math.max logic below + the "break" under it are not making sense to me (Olivier)
		// If someone touches this at least comment it; even better, get rid of it and refactor...
		for (var i = 0, len = Math.max(spellLevels.length, levelList.length); i < len; i += 1) {
			var spellLevel = i + 1; // spellLevel when calling the API below start at 1

			var levelButton = levelList[i];
			if (!levelButton) {
				levelButton = levelList[i] = listContainer.appendChild(createButton(this));
			} else if (!spellLevels[i]) {
				levelButton.hide();
				break;
			}
			levelButton.show();

			// we will examine below if the option is enabled or not, checked or not
			var enabled = false, checked = false;
			var upgradeCost = spellInstance.getUpgradeCost(spellLevel);
			var requiredLevel = spellInstance.getProperty('minPlayerLevel', spellLevel);
			var label = getText('ui.common.level') + ' ' + spellLevel;

			if (spellLevel <= spellInstance.level) {
				// our spell is already at this level: display a "check" and disable the option
				checked = true;
			} else if (window.gui.playerData.characterBaseInformations.level < requiredLevel) {
				// we don't have the required level
				label += ' (' + getText('ui.spell.requiredLevelShort', requiredLevel) + ')';
			} else if (params.remainingPoints < upgradeCost) {
				// we don't have enough points
				label += ' (' + getText('ui.spell.requiredPoints', upgradeCost) + ')';
			} else {
				// we can upgrade!
				enabled = true;
				label += ' (' + upgradeCost + ' ' + getText('ui.common.points') + ')';
			}

			levelButton.setText(label);
			levelButton.toggleClassName('disabled', !enabled);
			levelButton.toggleClassName('checked', checked);
			levelButton.setEnable(enabled);
			// add some info for the button 'tap' action:
			levelButton.spellLevel = spellLevel;
			levelButton.upgradeCost = upgradeCost;
		}

		contentReady();
	});
}

inherits(ContextualMenuSpellUpgrade, ContextualMenu);
module.exports = ContextualMenuSpellUpgrade;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/contextualMenus/ContextualMenuSpellUpgrade/index.js
 ** module id = 426
 ** module chunks = 0
 **/