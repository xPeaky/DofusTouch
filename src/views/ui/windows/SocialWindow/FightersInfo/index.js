require('./styles.less');
var inherits = require('util').inherits;
var WuiDom = require('wuidom');


var CharacterDisplay = require('CharacterDisplayWebGL');
var DirectionsEnum = require('DirectionsEnum');
var getText = require('getText').getText;
var TooltipBox = require('TooltipBox');
var fightingSide = require('socialEntityManager').fightingSide;

var MAX_PLAYERS = 5;

function FightersInfo() {
	WuiDom.call(this, 'div', { className: 'FightersInfo' });

	var allies = this.allies = {};
	var enemies = this.enemies = {};

	var alliesRow = this.createChild('div', { className: 'fighterRow' });
	var enemyRow = this.createChild('div', { className: 'fighterRow' });

	var icon;
	icon = allies.icon = alliesRow.createChild('div', { className: ['fightMode', 'defend', 'hidden'] });
	this._addFightModeToolTip(icon, getText('ui.common.defenders'), 'allies');

	icon = enemies.icon = enemyRow.createChild('div', { className: ['fightMode', 'attack', 'hidden'] });
	this._addFightModeToolTip(icon, getText('ui.common.attackers'), 'enemies');

	var alliesBox = allies.slotContainer = alliesRow.createChild('div', { className: 'fighterList' });
	var enemiesBox = enemies.slotContainer = enemyRow.createChild('div', { className: 'fighterList' });

	// icon for the target: tax collector or prism
	this.targetSlot = alliesBox.appendChild(this._createTargetDisplay());

	// icons for normal players
	var allySlots = allies.slots = [];
	var enemySlots = enemies.slots = [];

	var slot;
	for (var i = 0; i < MAX_PLAYERS; i += 1) {
		slot = alliesBox.appendChild(this._createFighterSlot(true));
		allySlots.push(slot);

		slot = enemiesBox.appendChild(this._createFighterSlot());
		enemySlots.push(slot);
	}
}

inherits(FightersInfo, WuiDom);
module.exports = FightersInfo;

function getFighterName(fighter) {
	var name = fighter.name + ' (' + getText('ui.common.short.level') + ' ' + fighter.level + ') ';
	switch (fighter._type) {
	case 'CharacterMinimalAllianceInformations':
		name += fighter.guild.guildName + ' - [' + fighter.alliance.allianceTag + ']';
		break;
	case 'CharacterMinimalGuildInformations':
		name += fighter.guild.guildName;
		break;
	default:
	}

	return name;
}

FightersInfo.prototype._addFightModeToolTip = function (elm, title, side) {
	var self = this;

	TooltipBox.addTooltip(elm, function () {
		var toolTipText = title + getText('ui.common.colon') + '\n';
		var fighters = self[side].slots;

		if (side === 'allies') {
			var targetInfo = self.targetSlot.fighter;
			toolTipText += targetInfo.name + ' (' + getText('ui.common.short.level') + ' ' + targetInfo.level + ')\n';
		}

		for (var i = 0; i < fighters.length; i += 1) {
			var fighter = fighters[i].fighter;
			if (fighter) {
				toolTipText += getFighterName(fighter) + '\n';
			}
		}

		return new WuiDom('div', { text: toolTipText });
	});
};

FightersInfo.prototype._createTargetDisplay = function () {
	var slot = new CharacterDisplay({ className: 'fighterIcon', scale: 'fitin' });

	TooltipBox.addTooltip(slot, function () {
		var target = slot.fighter;
		return new WuiDom('div', { text: target.name + ' (' + getText('ui.common.short.level') + ' ' + target.level + ')' });
	});

	// disable tooltip by default
	TooltipBox.enableTooltip(slot, false);
	return slot;
};

FightersInfo.prototype._createFighterSlot = function (canTap) {
	var slot = new CharacterDisplay({ className: 'fighterIcon', scale: 'fitin' });

	TooltipBox.addTooltip(slot, function () {
		return new WuiDom('div', { text: getFighterName(slot.fighter) });
	});

	// disable tooltip by default
	TooltipBox.enableTooltip(slot, false);

	if (!canTap) {
		return slot;
	}

	var self = this;
	slot.on('tap', function () {
		if (!self.fight) {
			return;
		}

		self.emit('slotTap', this.fighter);
	});

	return slot;
};

function setCharacterDisplay(slot, fighter) {
	slot.fighter = fighter;

	TooltipBox.enableTooltip(slot, true);

	slot.setLook(fighter.entityLook, {
		riderOnly: true,
		direction: DirectionsEnum.DIRECTION_SOUTH_WEST,
		animation: 'AnimArtwork',
		boneType:  'timeline/',
		skinType:  'timeline/'
	});
}

function resetCharacterDisplay(slot) {
	slot.fighter = null;
	slot.clear();
	console.log('CLEARING SLOT!');
	TooltipBox.enableTooltip(slot, false);
}

FightersInfo.prototype.reset = function () {
	this.fight = null;
	this.allies.icon.addClassNames('hidden');
	this.enemies.icon.addClassNames('hidden');

	resetCharacterDisplay(this.targetSlot);

	var alliesSlots = this.allies.slots;
	var enemiesSlots = this.enemies.slots;

	for (var i = 0; i < MAX_PLAYERS; i += 1) {
		resetCharacterDisplay(alliesSlots[i]);
		resetCharacterDisplay(enemiesSlots[i]);
	}
};

FightersInfo.prototype.setTarget = function (target) {
	setCharacterDisplay(this.targetSlot, target);
};

FightersInfo.prototype.setFight = function (type, fight) {
	this.type = type;
	this.fight = fight;

	this.allies.icon.delClassNames('hidden');
	this.enemies.icon.delClassNames('hidden');

	var fighters = fight.fighters;
	this.setFighters(fightingSide.allies, fighters.allies);
	this.setFighters(fightingSide.enemies, fighters.enemies);
};

FightersInfo.prototype.setFighter = function (side, fighter, position) {
	setCharacterDisplay(this[side].slots[position], fighter);
};

FightersInfo.prototype.removeFighter = function (side, position) {
	var slots = this[side].slots;
	var slot = slots.splice(position, 1)[0];
	resetCharacterDisplay(slot);
	this[side].slotContainer.appendChild(slot);
	slots.push(slot);
};

FightersInfo.prototype.setFighters = function (side, fighterList) {
	var slots = this[side].slots;
	for (var i = 0; i < MAX_PLAYERS; i += 1) {
		var fighter = fighterList[i];
		if (fighter) {
			setCharacterDisplay(slots[i], fighter);
		} else {
			resetCharacterDisplay(slots[i]);
		}
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/SocialWindow/FightersInfo/index.js
 ** module id = 865
 ** module chunks = 0
 **/