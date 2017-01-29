function FighterData() {
	this._type = null;
	this.alive = true;
	this.teamId = 0;
	this.isCarryied = false;

	this.disposition = {
		cellId: -1,
		direction: 0,
		carryingCharacterId: 0
	};

	this.look = null;

	this.stats = {
		actionPoints: 0,
		airElementReduction: 0,
		airElementResistPercent: 0,
		baseMaxLifePoints: 0,
		criticalDamageFixedResist: 0,
		dodgePALostProbability: 0,
		dodgePMLostProbability: 0,
		earthElementReduction: 0,
		earthElementResistPercent: 0,
		fireElementReduction: 0,
		fireElementResistPercent: 0,
		invisibilityState: 0,
		initiative: 0,
		lifePoints: 0,
		maxActionPoints: 0,
		maxLifePoints: 0,
		maxMovementPoints: 0,
		movementPoints: 0,
		neutralElementReduction: 0,
		neutralElementResistPercent: 0,
		permanentDamagePercent: 0,
		pushDamageFixedResist: 0,
		shieldPoints: 0,
		summoned: false,
		summoner: 0,
		tackleBlock: 0,
		tackleEvade: 0,
		waterElementReduction: 0,
		waterElementResistPercent: 0
	};
}
module.exports = FighterData;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function updateProperty(property, values) {
	for (var name in property) {
		if (values[name] !== undefined) {
			property[name] = values[name];
		}
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
FighterData.prototype.updateData = function (data) {
	if (data._type !== undefined) {
		this._type = data._type;
	}
	if (data.alive !== undefined) {
		this.alive = data.alive;
	}
	if (data.teamId !== undefined) {
		this.teamId = data.teamId;
	}
	if (data.disposition) {
		updateProperty(this.disposition, data.disposition);
	}
	if (data.look) {
		this.look = data.look;
	}
	if (data.stats) {
		updateProperty(this.stats, data.stats);
	}
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
FighterData.prototype.pointVariation = function (statName, variation) {
	this.stats[statName] += variation;
	if (this.stats[statName] < 0) {
		this.stats[statName] = 0;
	}
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/fightManager/fighterData/index.js
 ** module id = 279
 ** module chunks = 0
 **/