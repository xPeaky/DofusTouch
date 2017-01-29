var positions = {
	amulet: 0,
	weapon: 1,
	ringLeft: 2,
	belt: 3,
	ringRight: 4,
	boots: 5,
	hat: 6,
	cape: 7,
	pets: 8,
	dofus1: 9,
	dofus2: 10,
	dofus3: 11,
	dofus4: 12,
	dofus5: 13,
	dofus6: 14,
	shield: 15,
	mount: 16,
	mutation: 20,
	boostFood: 21,
	firstBonus: 22,
	secondBonus: 23,
	firstMalus: 24,
	secondMalus: 25,
	roleplayBuffer: 26,
	follower: 27,
	companion: 28,
	notEquipped: 63
};
module.exports.positions = positions;


var superTypeNotEquippable = [
	9, /* Ressources */
	14, /* Objets de quête */
	15, /* Objets de mutation */
	16, /* Objets nourritures */
	17, /* Bénédiction */
	18, /* Malédiction */
	6, /* Objets utilisables */
	19, /* Roleplay buffs */
	21, /* Monture */
	20, /* Personnage suiveur */
	8, /* Objet de capture */
	22 /* Objets vivant */
];
module.exports.superTypeNotEquippable = superTypeNotEquippable;

var filterEquipment = [
	false,// (vide)
	true, // Amulettes
	true, // Armes
	true, // Anneaux
	true, // Ceintures
	true, // Bottes
	false,// Objets utilisables
	true, // Boucliers
	true, // Objets de capture
	false,// Ressources
	true, // Chapeau
	true, // Cape
	true, // Familier
	true, // Dofus
	false,// Objets de quête
	false,// Objets de mutation
	false,// Objets nourriture
	false,// Bénédictions
	false,// Malédictions
	false,// Roleplay buffs
	false,// Personnage suiveur
	false,// Monture
	true, // Objets vivants
	true  // Compagnon
];
module.exports.filterEquipment = filterEquipment;

var filterConsumables = [
	false,// (vide)
	false,// Amulettes
	false,// Armes
	false,// Anneaux
	false,// Ceintures
	false,// Bottes
	true, // Objets utilisables
	false,// Boucliers
	false,// Objets de capture
	false,// Ressources
	false,// Chapeau
	false,// Cape
	false,// Familier
	false,// Dofus
	false,// Objets de quête
	false,// Objets de mutation
	false,// Objets nourriture
	false,// Bénédictions
	false,// Malédictions
	false,// Roleplay buffs
	false,// Personnage suiveur
	false,// Monture
	false,// Objets vivants
	false  // Compagnon
];
module.exports.filterConsumables = filterConsumables;

var filterRessources = [
	false,// (vide)
	false,// Amulettes
	false,// Armes
	false,// Anneaux
	false,// Ceintures
	false,// Bottes
	false,// Objets utilisables
	false,// Boucliers
	false,// Objets de capture
	true, // Ressources
	false,// Chapeau
	false,// Cape
	false,// Familier
	false,// Dofus
	false,// Objets de quête
	false,// Objets de mutation
	false,// Objets nourriture
	false,// Bénédictions
	false,// Malédictions
	false,// Roleplay buffs
	false,// Personnage suiveur
	false,// Monture
	false,// Objets vivants
	false  // Compagnon
];
module.exports.filterRessources = filterRessources;

var filterQuest = [
	false,// (vide)
	false,// Amulettes
	false,// Armes
	false,// Anneaux
	false,// Ceintures
	false,// Bottes
	false,// Objets utilisables
	false,// Boucliers
	false,// Objets de capture
	false,// Ressources
	false,// Chapeau
	false,// Cape
	false,// Familier
	false,// Dofus
	true, // Objets de quête
	false,// Objets de mutation
	false,// Objets nourriture
	false,// Bénédictions
	false,// Malédictions
	false,// Roleplay buffs
	false,// Personnage suiveur
	false,// Monture
	false,// Objets vivants
	false  // Compagnon
];
module.exports.filterQuest = filterQuest;

var objectErrors = {
	inventoryFull: 1,
	cannotEquipTwice: 2,
	notTradable: 3,
	cannotDrop: 4,
	cannotDropNoPlace: 5,
	cannotDestroy: 6,
	levelTooLow: 7,
	livingObjectRefusedFood: 8,
	cannotUnequip: 9,
	cannotEquipHere: 10,
	criterions: 11,
	mimicryObjectError: 12
};
module.exports.objectErrors = objectErrors;

var categories = {
	equipment: 0,
	consumables: 1,
	resources: 2,
	quest: 3,
	preset: 4
};
module.exports.categories = categories;

var itemTypePositions = [
	[], // 0 vide
	[positions.amulet], // 1 Amulettes
	[positions.weapon], // 2 Armes
	[positions.ringLeft, positions.ringRight], // 3 Anneaux
	[positions.belt], // 4 Ceintures
	[positions.boots], // 5 Bottes
	[], // 6 Objets utilisable
	[positions.shield], // 7 Boucliers
	[positions.weapon], // 8 Objets de capture
	[], // 9 Ressources
	[positions.hat], // 10 Chapeaux
	[positions.cape], // 11 Cape
	[positions.pets], // 12 Familiers
	// 13 Dofus & Trophées
	[positions.dofus1, positions.dofus2, positions.dofus3, positions.dofus4, positions.dofus5, positions.dofus6],
	[], // 14 Objets de quêtes
	[positions.mutation], // 15 Objets de mutation
	[positions.boostFood], // 16 Objets nourriture
	[positions.firstBonus, positions.secondBonus], // 17 Benedictions
	[positions.firstMalus, positions.secondMalus], // 18 Maledictions
	[positions.roleplayBuffer], // 19 Buffs roleplay
	[positions.follower], // 20 Personnages suiveurs
	[positions.mount], // 21 Montures
	[], // 22 Objets vivants
	[positions.companion] // 23 Compagnons
];
module.exports.itemTypePositions = itemTypePositions;


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/itemManager/enums.js
 ** module id = 323
 ** module chunks = 0
 **/