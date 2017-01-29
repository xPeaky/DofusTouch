require('./styles.less');
var inherits = require('util').inherits;
var windowsManager = require('windowsManager');
var Window = require('Window');
var Button = require('Button').DofusButton;
var getText = require('getText').getText;
var WuiDom = require('wuidom');
var Table = require('Table');
var addTooltip = require('TooltipBox').addTooltip;
var SpellDescription = require('SpellDescription');
var assetPreloading = require('assetPreloading');

function SpellForgetWindow() {
	Window.call(this, {
		className: 'SpellForgetWindow',
		title: getText('ui.spellForget.title'),
		positionInfo: { left: 'c', top: 'c', width: 400, height: 350 }
	});

	var self = this;
	this.selectedSpellId = null;
	this.selectedSpellName = null;

	function selectSpell(row) {
		self.selectedSpellId = row.spellId;
		self.selectedSpellName = row.spellName;
	}

	this.table = this.windowBody.appendChild(new Table({
		colIds: ['icon', 'name', 'rank'],
		colCount: 3,
		highlightable: true,
		headerContent: ['', getText('ui.common.spellName'), getText('ui.social.guildRank')],
		onRowTap: selectSpell
	}));

	this.validButton = this.windowBody.appendChild(new Button(getText('ui.common.validation')));
	this.validButton.on('tap', function () {
		if (self.selectedSpellId) {
			window.gui.openConfirmPopup({
				title: getText('ui.popup.warning'),
				message: getText('ui.popup.spellForgetConfirm', self.selectedSpellName),
				cb: function (result) {
					if (!result) {
						return;
					}
					window.dofus.sendMessage('ValidateSpellForgetMessage', {
						spellId: self.selectedSpellId
					});
				}
			});
		}
	});

	this.on('open', function () {
		this.table.clearContent();
		// add spells above level 1
		var playerSpells = window.gui.playerData.characters.mainCharacter.spellData.spells;
		var upgradedSpells = [];
		for (var id in playerSpells) {
			var spell = playerSpells[id];
			if (spell.level > 1) {
				upgradedSpells.push(spell);
			}
		}
		addSpells(upgradedSpells);
	});

	this.on('close', function () {
		this.selectedSpellId = null;
		this.selectedSpellName = null;
	});

	function addSpell(spell, url) {
		var icon = new WuiDom('div', { className: 'icon', name: 'icon' });
		icon.setStyle('backgroundImage', url);
		addTooltip(icon, function () {
			return new SpellDescription({ spell: spell });
		});
		self.table.addRow(
			{
				icon: icon,
				name: spell.spell.nameId,
				rank: spell.level
			},
			{
				spellId: spell.id,
				spellName: spell.spell.nameId
			}
		);
	}

	function addSpells(upgradedSpells) {
		var iconUris = [];
		for (var i = 0; i < upgradedSpells.length; i++) {
			var spell = upgradedSpells[i];
			iconUris.push(spell.getIconUri());
		}

		assetPreloading.preloadImages(iconUris, function (urls) {
			for (var i = 0; i < upgradedSpells.length; i++) {
				addSpell(upgradedSpells[i], urls[i]);
			}
			if (upgradedSpells.length > 0) {
				// select the first item of the list
				self.table.highlight(0);
				self.validButton.enable();
			} else {
				self.validButton.disable();
			}
		});
	}

	window.gui.on('SpellForgetUIMessage', function (msg) {
		if (msg.open) {
			windowsManager.openDialog('spellForget');
		} else {
			windowsManager.close('spellForget');
		}
	});
}

inherits(SpellForgetWindow, Window);
module.exports = SpellForgetWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SpellForgetWindow/index.js
 ** module id = 903
 ** module chunks = 0
 **/