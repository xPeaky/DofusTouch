var Actor           = require('./main.js');
var GameContextEnum = require('GameContextEnum');
var Entity          = require('Entity');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
// Taken from Ankmas code: EntitiesLookManager.isBoneCorrect (labeled FIXME in Ankama's code)
var CORRECT_BONES = {
	1:    true, // normal
	113:  true, // Momification
	44:   true, // picole
	1575: true, // Bones zobal - psychopathe
	1576: true  // Bones zobal - pleutre
};

var PRISM_IDS = [1097, 1111, 1112, 3451];

var breedSkinToCreatureBones = null;

function getBreedSkinToCreatureBones() {
	if (breedSkinToCreatureBones) { return breedSkinToCreatureBones; }

	breedSkinToCreatureBones = {};

	var regexp = /^\{[\d]*\|([\d]*)/i;
	var breeds = window.gui.databases.Breeds;
	for (var id in breeds) {
		var breed = breeds[id];
		var m = regexp.exec(breed.maleLook)[1];
		var f = regexp.exec(breed.femaleLook)[1];
		breedSkinToCreatureBones[m] = breed.creatureBonesId;
		breedSkinToCreatureBones[f] = breed.creatureBonesId;
	}

	// special case for "Colere de Zatoishwan" (see Ankmas code: EntitiesLookManager.getLookFromContextInfos)
	breedSkinToCreatureBones[453] = breeds[12].creatureBonesId;

	return breedSkinToCreatureBones;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Get the Creature mode (pockemon mode) bones of actor */
Actor.prototype.getCreatureBones = function () {
	switch (this.data.type) {
	case 'FightTeamInformations':
	case 'FightAllianceTeamInformations':
	case 'FightTeamLightInformations':
	case 'GameRolePlayNpcInformations':
	case 'GameRolePlayNpcWithQuestInformations':
		// Don't change look
		return null;
	case 'GameFightCharacterInformations':
	case 'GameRolePlayCharacterInformations':
	case 'GameRolePlayHumanoidInformations':
		var look = Entity.getLookWithoutMount(this.realLook);
		var bone = look.bonesId;
		if (!CORRECT_BONES[bone]) { return 1749; } // player incarnation (labeled FIXME in Ankama's code)
		var skin = look.skins[0];
		return getBreedSkinToCreatureBones()[skin] || 666;
	case 'GameRolePlayPrismInformations':
		return 2247; // prism
	case 'GameRolePlayMerchantInformations':
		return 1965; // merchant
	case 'GameRolePlayTaxCollectorInformations':
	case 'GameFightTaxCollectorInformations':
		return 1813; // taxcollector
	case 'GameRolePlayGroupMonsterInformations':
	case 'GameFightMonsterInformations':
	case 'GameFightMonsterWithAlignmentInformations':
		if (this.data.isBoss) {
			return 1748;
		}
		if (PRISM_IDS.indexOf(this.data.creatureGenericId) >= 0) {
			return 2247;
		}
		if (this.data.isSummon) {
			return 1765;
		}
		return 1747; // monster
	case 'GameRolePlayMountInformations':
		return 1749; // incarnation
	case 'GameFightMutantInformations':
	case 'GameRolePlayMutantInformations':
		return 1747; // monster
	default:
		return 666; // unknown
	}
};


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function creatureAttackAnimationModifier(symbol) {
	return {
		base:      symbol.base,
		type:      0,
		param:     null,
		direction: symbol.direction
	};
}

function creatureEmoteAnimationModifier(symbol) {
	return {
		base:      'AnimAttaque',
		type:      0,
		param:     null,
		direction: symbol.direction
	};
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
Actor.prototype.setCreatureLook = function (options, cb) {
	var inFight = window.isoEngine.gameContext === GameContextEnum.FIGHT;
	if (!inFight && !this.data.humanoidInfo) {
		// Monsters and NPCs keep their look in roleplay mode
		if (!this.realLook) {
			// real look not received yet
			return cb && cb();
		}

		return this.actorManager.setActorLook(this.actorId, this.realLook, cb, true);
	}

	var boneId = this.getCreatureBones();
	if (!boneId) { return; }

	var look = {
		bonesId: boneId,
		skins: [],
		indexedColors: [],
		scales: [90],
		subentities: []
	};

	var self = this;

	// Creature mode animations are missing many animations, so replace them with the attack animation.
	Entity.prototype.setLook.call(this, look, options, function () {
		// Add animation modifiers for 'AnimArme' and 'AnimAttaque'
		// (only available animations are AnimArme0 and AnimAttaque0)
		self.animManager.addAnimationModifier('AnimArme',    creatureAttackAnimationModifier);
		self.animManager.addAnimationModifier('AnimAttaque', creatureAttackAnimationModifier);
		self.animManager.addAnimationModifier('AnimTacle',   'AnimHit');

		// Animation modifiers for emote animations
		self.animManager.addAnimationModifier('AnimEmote',   creatureEmoteAnimationModifier);

		// Animation modifiers for harvesting
		self.animManager.addAnimationModifier('AnimConsulter',    'AnimAttaque0'); // Read
		self.animManager.addAnimationModifier('AnimCueillir0',    'AnimAttaque0'); // Pick (flower)
		self.animManager.addAnimationModifier('AnimCueillirSol0', 'AnimAttaque0');
		self.animManager.addAnimationModifier('AnimDrop',         'AnimAttaque0');
		self.animManager.addAnimationModifier('AnimFaucher',      'AnimAttaque0'); // Reap
		self.animManager.addAnimationModifier('AnimHache',        'AnimAttaque0'); // Axe
		self.animManager.addAnimationModifier('AnimPeche',        'AnimAttaque0'); // Fish
		self.animManager.addAnimationModifier('AnimPickup',       'AnimAttaque0');
		self.animManager.addAnimationModifier('AnimPioche',       'AnimAttaque0'); // Pickaxe
		self.animManager.addAnimationModifier('AnimPuiser',       'AnimAttaque0'); // Draw water
		self.animManager.addAnimationModifier('AnimThrow',        'AnimAttaque0');


		// TODO: creature should also ignore 'fun' animations
		self.staticAnim();
		return cb && cb();
	});
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/Actor/creatureMode.js
 ** module id = 618
 ** module chunks = 0
 **/