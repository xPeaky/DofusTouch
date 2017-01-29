require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var Tabs = require('Tabs');
var ProgressBar = require('ProgressBar');
var getText = require('getText').getText;
var tapBehavior = require('tapBehavior');
var windowsManager = require('windowsManager');
var addTooltip = require('TooltipBox').addTooltip;
var WuiDom = require('wuidom');
var getStatCost = require('CharacUpdateWindow').getStatCost;
var playUiSound = require('audioManager').playUiSound;
var Button = require('Button');

var helpTexts;

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @class CharacteristicsWindow
 * @desc  Displays user's character characteristics.
 */
function CharacteristicsWindow() {
	Window.call(this, {
		title: getText('ui.common.caracteristics'),
		className: 'characteristics',
		positionInfo: { left: 40, top: 'c', width: 320, height: 630 }
	});

	var self = this;

	this.on('open', this.alignWithEquipment);

	this.infos = this.windowBody.createChild('div', { className: 'infos' });
	this.logoWrapper = this.infos.createChild('div', { className: 'logoWrapper' });
	this.logo = this.logoWrapper.appendChild(new Button({ className: 'logo' }, function () {
		windowsManager.open('grimoire', { tabId: 'alignment' });
	}));
	this.playerName = this.infos.createChild('div', { className: 'playerName' });
	this.infosSup = this.infos.createChild('div', { className: 'infosSup' });

	this.stats = this.windowBody.createChild('div', { className: 'stats' });

	var gui = window.gui;

	gui.on('CharacterStatsListMessage', function (msg) {
		if (!window.gui.playerData.characterBreed) {
			// In PVP MODE CharacterStatsListMessage is send right after the character's selection
			//TODO: investigate that
			return;
		}
		self.updateStats(msg.stats);
	});

	helpTexts = {
		maxLifePoints: getText('ui.help.life'),
		actionPoints: getText('ui.help.AP'),
		movementPoints: getText('ui.help.MP'),
		initiative: getText('ui.help.initiative'),
		prospecting: getText('ui.help.prospecting'),
		range: getText('ui.help.range'),
		summonableCreaturesBoost: getText('ui.help.summonableCreatures'),
		vitality: getText('ui.help.vitality'),
		wisdom: getText('ui.help.wisdom'),
		strength: getText('ui.help.strength'),
		intelligence: getText('ui.help.intelligence'),
		chance: getText('ui.help.chance'),
		agility: getText('ui.help.agility'),
		level: getText('ui.help.level'),
		red: getText('ui.help.energy'),
		blue: getText('ui.help.xp'),
		characteristics: getText('ui.help.boostPoints')
	};

	window.gui.playerData.alignment.on('alignmentChanged', function () {
		var infos = window.gui.playerData.characterBaseInformations;
		var alignmentModule = window.gui.playerData.alignment;

		alignmentModule.getAlignmentImageUrl(function (url) {
			self.logo.setStyle('backgroundImage', url);
		});

		self.playerName.setText(infos.name);
		if (window.gui.playerData.characterBreed) {
			self.infosSup.setText(
				window.gui.playerData.characterBreed.shortNameId +
				', ' +
				getText('ui.common.level') + ' ' + infos.level
			);
		}
		addTooltip(self.infosSup, helpTexts.level);
	});
}
inherits(CharacteristicsWindow, Window);
module.exports = CharacteristicsWindow;

/** Align characteristics window with equipment window. Characteristics window is opening */
CharacteristicsWindow.prototype.alignWithEquipment = function () {
	var equip = windowsManager.getWindow('equipment');
	if (!equip.openState) { return; }
	this.setStyles({ top: equip.getStyle('top'), height: equip.getStyle('height') });
	windowsManager.arrangeOpeningWindow(this.id, { leftOf: equip.id });
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// UI creation helpers below

function createPanel(root) {
	return root.createChild('div', { className: 'panel' });
}

function createTable(panel, type) {
	return panel.createChild('table', { className: type });
}

function newProgressBar(panel, label, type, current, max) {
	var bar = panel.createChild('div', { className: 'barWrapper' });
	var labelObject = bar.createChild('div', { className: 'label', text: label });
	var progressBar = bar.appendChild(new ProgressBar({ className: type, value: current / max }));
	addTooltip(labelObject, helpTexts[type]);
	addTooltip(progressBar, current + ' / ' + max);
}

function noZero(value) {
	return value || '-';
}

function getTotalStat(stat) {
	return stat.base + stat.alignGiftBonus + stat.objectsAndMountBonus + stat.contextModif;
}

function addStatDetailsTooltip(stats, uiObject, key) {
	var toolTipContent;
	addTooltip(uiObject, function () {
		if (!toolTipContent) {
			var stat = stats[key];

			var baseText = getText('ui.common.base') + getText('ui.common.colon') + noZero(stat.base);
			var equipementText = getText('ui.common.equipement') + getText('ui.common.colon') +
				noZero(stat.objectsAndMountBonus);
			var bonusText = getText('ui.common.gifts') + '+' + getText('ui.common.boost') + getText('ui.common.colon');
			bonusText += noZero(stat.alignGiftBonus + stat.contextModif);

			toolTipContent = new WuiDom('div', { className: 'toolTipLabelBlock' });
			toolTipContent.createChild('div', { className: 'toolTipLabel', text: baseText });
			toolTipContent.createChild('div', { className: 'toolTipLabel', text: equipementText });
			toolTipContent.createChild('div', { className: 'toolTipLabel', text: bonusText });
		}
		return toolTipContent;
	});
}

function newSummaryStatLine(table, label, key, value, className) {
	var line = table.createChild('tr');
	var labelObject = line.createChild('td', { className: ['label', className], text: label });
	addTooltip(labelObject, helpTexts[key]);
	line.createChild('td', { className: 'value', text: noZero(value) });
}

function newTitle(table, label, numColumn) {
	numColumn = numColumn || 4;
	var titleRow = table.createChild('tr');
	titleRow.createChild('td', { className: 'tableTitle', text: label, attr: { colspan: numColumn } });
	return titleRow;
}

function advancedStatLine(table, label, data, className) {
	var baseText = noZero(data.base);
	var bonusText = noZero(data.alignGiftBonus + data.objectsAndMountBonus + data.contextModif);
	var totalText = noZero(data.base + data.alignGiftBonus + data.objectsAndMountBonus + data.contextModif);

	var line = table.createChild('tr');
	line.createChild('td', { className: ['label', className], text: label });
	line.createChild('td', { className: 'base', text: baseText });
	line.createChild('td', { className: 'bonus', text: bonusText });
	line.createChild('td', { className: 'total', text: totalText });
}

function newCharacStatLine(table, stats, label, key, className) {
	var line = table.createChild('tr');
	var labelObject = line.createChild('td', { className: ['label', className], text: label });
	addTooltip(labelObject, helpTexts[key]);
	var stat = stats[key];
	var valueObject = line.createChild('td', { className: 'value', text: noZero(getTotalStat(stat)) });
	addStatDetailsTooltip(stats, valueObject, key);

	var upgradeCell = line.createChild('td', { className: 'upgrade' });
	var upgradeButton = upgradeCell.createChild('div', { className: 'upgradeButton' });
	tapBehavior(upgradeButton);

	var keyToCostSteps = 'statsPointsFor' + key[0].toUpperCase() + key.substr(1);
	var costStepsValues = window.gui.playerData.characterBreed[keyToCostSteps];

	upgradeButton.on('tap', function () {
		playUiSound('PLUS_BUTTON');
		windowsManager.open('characUpdate', {
			label: label,
			characteristicName: key,
			initialLevel: stats[key].base,
			pointsRemaining: stats.statsPoints,
			costSteps: costStepsValues
		});
	});

	var currentCostStepValue = getStatCost(costStepsValues, stat.base);

	if (stats.statsPoints < currentCostStepValue) {
		upgradeButton.disable();
		upgradeButton.addClassNames('disabled');
	}
}

function pointCapitalLine(table, label, value) {
	var line = table.createChild('tr');
	line.createChild('td', { className: ['label', 'pointCapital'], text: label });
	line.createChild('td', { className: ['value', 'pointCapital'], text: value });
	addTooltip(line, helpTexts.characteristics);
}

function createAdvancedStatHeaders(table) {
	var titleTr = table.createChild('tr');
	titleTr.createChild('td', { className: 'label', text: getText('ui.common.caracteristics') });
	titleTr.createChild('td', { className: 'base', text: getText('ui.common.base') });
	titleTr.createChild('td', { className: 'bonus', text: getText('ui.fightend.bonus') });
	titleTr.createChild('td', { className: 'total', text: getText('ui.common.total') });
}

/**▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
 * @method updateStats
 * @desc   Update statistics.
 */
CharacteristicsWindow.prototype.updateStats = function (stats) {
	this.stats.clearContent();

	this.tabs = new Tabs();
	this.stats.appendChild(this.tabs);

	this.panels = this.stats.createChild('div', { className: 'panels' });

	//SUMMARY PANEL--------------------------------------------------------------------------

	this.panelSummary = createPanel(this.panels);

	newProgressBar(this.panelSummary, getText('ui.common.energy'), 'red',
		stats.energyPoints, stats.maxEnergyPoints);
	newProgressBar(this.panelSummary, getText('ui.common.experiment'), 'blue',
		(stats.experience - stats.experienceLevelFloor),
		(stats.experienceNextLevelFloor - stats.experienceLevelFloor));

	var summaryTable = createTable(this.panelSummary, 'summaryTable');

	newSummaryStatLine(summaryTable, getText('ui.stats.lifePoints'), 'maxLifePoints',
		stats.lifePoints + ' / ' + stats.maxLifePoints, 'iconLifePoints');
	//COMPAT215 use ui.stats.actionPoints
	newSummaryStatLine(summaryTable, getText('ui.stats.shortAP'), 'actionPoints',
		getTotalStat(stats.actionPoints), 'iconActionPoints');
	//COMPAT215 use ui.stats.movementPoints
	newSummaryStatLine(summaryTable, getText('ui.stats.shortMP'), 'movementPoints',
		getTotalStat(stats.movementPoints), 'iconMovementPoints');
	var totalInit = getTotalStat(stats.initiative);
	var currentInit = Math.floor(totalInit * stats.lifePoints / stats.maxLifePoints);
	newSummaryStatLine(summaryTable, getText('ui.stats.initiative'), 'initiative',
		currentInit + ' / ' + totalInit, 'iconInitiative');
	newSummaryStatLine(summaryTable, getText('ui.stats.prospecting'), 'prospecting',
		getTotalStat(stats.prospecting), 'iconProspecting');
	newSummaryStatLine(summaryTable, getText('ui.stats.range'), 'range', getTotalStat(stats.range), 'iconRange');
	newSummaryStatLine(summaryTable, getText('ui.stats.summonableCreatures'), 'summonableCreaturesBoost',
		getTotalStat(stats.summonableCreaturesBoost), 'iconSummon');

	var characTable = createTable(this.panelSummary, 'characTable');

	newTitle(characTable, getText('ui.common.caracteristics'), 3);
	newCharacStatLine(characTable, stats, getText('ui.stats.vitality'), 'vitality', 'iconVitality');
	newCharacStatLine(characTable, stats, getText('ui.stats.wisdom'), 'wisdom', 'iconWisdom');
	newCharacStatLine(characTable, stats, getText('ui.stats.strength'), 'strength', 'iconStrength');
	newCharacStatLine(characTable, stats, getText('ui.stats.intelligence'), 'intelligence', 'iconIntelligence');
	newCharacStatLine(characTable, stats, getText('ui.stats.chance'), 'chance', 'iconChance');
	newCharacStatLine(characTable, stats, getText('ui.stats.agility'), 'agility', 'iconAgility');

	pointCapitalLine(characTable, getText('ui.stats.statPoints'), stats.statsPoints);

	//DETAILS PANEL--------------------------------------------------------------------------

	this.panelAdvanced = createPanel(this.panels);
	var advancedTable = createTable(this.panelAdvanced, 'advancedTable');
	createAdvancedStatHeaders(advancedTable);

	//Primary stats
	newTitle(advancedTable, getText('ui.charaSheet.primaryStats'));
	advancedStatLine(advancedTable, getText('ui.stats.vitality'), stats.vitality, 'iconVitality');
	advancedStatLine(advancedTable, getText('ui.stats.wisdom'), stats.wisdom, 'iconWisdom');
	advancedStatLine(advancedTable, getText('ui.stats.strength'), stats.strength, 'iconStrength');
	advancedStatLine(advancedTable, getText('ui.stats.intelligence'), stats.intelligence, 'iconIntelligence');
	advancedStatLine(advancedTable, getText('ui.stats.chance'), stats.chance, 'iconChance');
	advancedStatLine(advancedTable, getText('ui.stats.agility'), stats.agility, 'iconAgility');

	//TODO: mount points? see Ankama's CharacterSheetUi.as

	//COMPAT215 use ui.stats.actionPoints
	advancedStatLine(advancedTable, getText('ui.stats.shortAP'), stats.actionPoints, 'iconActionPoints');
	//COMPAT215 use ui.stats.movementPoints
	advancedStatLine(advancedTable, getText('ui.stats.shortMP'), stats.movementPoints, 'iconMovementPoints');
	advancedStatLine(advancedTable, getText('ui.stats.initiative'), stats.initiative, 'iconInitiative');
	advancedStatLine(advancedTable, getText('ui.stats.prospecting'), stats.prospecting, 'iconProspecting');
	advancedStatLine(advancedTable, getText('ui.stats.range'), stats.range, 'iconRange');
	advancedStatLine(advancedTable, getText('ui.stats.summonableCreatures'), stats.summonableCreaturesBoost, 'iconSummon');

	//Secondary stats
	newTitle(advancedTable, getText('ui.charaSheet.secondaryStats'));
	advancedStatLine(advancedTable, getText('ui.stats.PAAttack'), stats.PAAttack, 'iconAttackAP');
	advancedStatLine(advancedTable, getText('ui.stats.dodgeAP'), stats.dodgePALostProbability, 'iconDodgeAP');
	advancedStatLine(advancedTable, getText('ui.stats.PMAttack'), stats.PMAttack, 'iconAttackMP');
	advancedStatLine(advancedTable, getText('ui.stats.dodgeMP'), stats.dodgePMLostProbability, 'iconDodgeMP');
	advancedStatLine(advancedTable, getText('ui.stats.criticalHit'), stats.criticalHit, 'iconCriticalHit');
	advancedStatLine(advancedTable, getText('ui.stats.healBonus'), stats.healBonus, 'iconHeal');
	advancedStatLine(advancedTable, getText('ui.stats.takleBlock'), stats.tackleBlock, 'iconTackle');
	advancedStatLine(advancedTable, getText('ui.stats.takleEvade'), stats.tackleEvade, 'iconEvade');

	//Damages
	newTitle(advancedTable, getText('ui.stats.damagesBonus'));
	advancedStatLine(advancedTable, getText('ui.stats.damagesBonus'), stats.allDamagesBonus, 'iconDamage');
	advancedStatLine(advancedTable, getText('ui.stats.damagesBonusPercent'), stats.damagesBonusPercent,
		'iconDamagePercent');
	advancedStatLine(advancedTable, getText('ui.stats.criticalDamageBonus'), stats.criticalDamageBonus,
		'iconCriticalDamage');
	advancedStatLine(advancedTable, getText('ui.stats.neutralDamageBonus'), stats.neutralDamageBonus, 'iconYinyang');
	advancedStatLine(advancedTable, getText('ui.stats.earthDamageBonus'), stats.earthDamageBonus, 'iconStrength');
	advancedStatLine(advancedTable, getText('ui.stats.fireDamageBonus'), stats.fireDamageBonus, 'iconIntelligence');
	advancedStatLine(advancedTable, getText('ui.stats.waterDamageBonus'), stats.waterDamageBonus, 'iconChance');
	advancedStatLine(advancedTable, getText('ui.stats.airDamageBonus'), stats.airDamageBonus, 'iconAgility');
	advancedStatLine(advancedTable, getText('ui.stats.return'), stats.reflect, 'iconReturn');
	advancedStatLine(advancedTable, getText('ui.stats.weaponDamagesPercent'), stats.weaponDamagesBonusPercent,
		'iconWeaponDamage');
	advancedStatLine(advancedTable, getText('ui.stats.trapBonus'), stats.trapBonus, 'iconTrap');
	advancedStatLine(advancedTable, getText('ui.stats.trapBonusPercent'), stats.trapBonusPercent, 'iconTrapPercent');
	//COMPAT215 double check (used to be ui.stats.push)
	advancedStatLine(advancedTable, getText('ui.stats.pushDamageBonus'), stats.pushDamageBonus, 'iconPushDamage');

	newTitle(advancedTable, getText('ui.common.resistances'));
	advancedStatLine(advancedTable, getText('ui.stats.neutralReduction'),
		stats.neutralElementReduction, 'iconYinyang');
	advancedStatLine(advancedTable, getText('ui.stats.neutralReductionPercent'),
		stats.neutralElementResistPercent, 'iconYinyang');
	advancedStatLine(advancedTable, getText('ui.stats.earthReduction'), stats.earthElementReduction, 'iconStrength');
	advancedStatLine(advancedTable, getText('ui.stats.earthReductionPercent'),
		stats.earthElementResistPercent, 'iconStrength');
	advancedStatLine(advancedTable, getText('ui.stats.fireReduction'), stats.fireElementReduction, 'iconIntelligence');
	advancedStatLine(advancedTable, getText('ui.stats.fireReductionPercent'),
		stats.fireElementResistPercent, 'iconIntelligence');
	advancedStatLine(advancedTable, getText('ui.stats.waterReduction'), stats.waterElementReduction, 'iconChance');
	advancedStatLine(advancedTable, getText('ui.stats.waterReductionPercent'),
		stats.waterElementResistPercent, 'iconChance');
	advancedStatLine(advancedTable, getText('ui.stats.airReduction'), stats.airElementReduction, 'iconAgility');
	advancedStatLine(advancedTable, getText('ui.stats.airReductionPercent'),
		stats.airElementResistPercent, 'iconAgility');
	advancedStatLine(advancedTable, getText('ui.stats.criticalDamageReduction'), stats.criticalDamageReduction,
		'iconCriticalReduction');
	//COMPAT215 double check (used to be ui.stats.pushFixed)
	advancedStatLine(advancedTable, getText('ui.stats.pushDamageReduction'), stats.pushDamageReduction,
		'iconPushDamageReduction');

	newTitle(advancedTable, getText('ui.common.resistancesPvp'));
	advancedStatLine(advancedTable, getText('ui.stats.neutralReduction'),
		stats.pvpNeutralElementReduction, 'iconYinyang');
	advancedStatLine(advancedTable, getText('ui.stats.neutralReductionPercent'),
		stats.pvpNeutralElementResistPercent, 'iconYinyang');
	advancedStatLine(advancedTable, getText('ui.stats.earthReduction'),
		stats.pvpEarthElementReduction, 'iconStrength');
	advancedStatLine(advancedTable, getText('ui.stats.earthReductionPercent'),
		stats.pvpEarthElementResistPercent, 'iconStrength');
	advancedStatLine(advancedTable, getText('ui.stats.fireReduction'),
		stats.pvpFireElementReduction, 'iconIntelligence');
	advancedStatLine(advancedTable, getText('ui.stats.fireReductionPercent'),
		stats.pvpFireElementResistPercent, 'iconIntelligence');
	advancedStatLine(advancedTable, getText('ui.stats.waterReduction'), stats.pvpWaterElementReduction, 'iconChance');
	advancedStatLine(advancedTable, getText('ui.stats.waterReductionPercent'),
		stats.pvpWaterElementResistPercent, 'iconChance');
	advancedStatLine(advancedTable, getText('ui.stats.airReduction'), stats.pvpAirElementReduction, 'iconAgility');
	advancedStatLine(advancedTable, getText('ui.stats.airReductionPercent'),
		stats.pvpAirElementResistPercent, 'iconAgility');

	this.tabs.addTab(getText('ui.stats.summary'), this.panelSummary);
	this.tabs.addTab(getText('ui.stats.advanced'), this.panelAdvanced);
	this.tabs.openTab(0);
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/CharacteristicsWindow/index.js
 ** module id = 684
 ** module chunks = 0
 **/