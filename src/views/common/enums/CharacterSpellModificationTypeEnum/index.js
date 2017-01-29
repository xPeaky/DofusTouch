/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Le type de modifications qui peuvent être affectées à un sort */
module.exports = {
	/** Modification invalide */
	INVALID_MODIFICATION: 0,
	/** Rend la portée du sort boostable */
	RANGEABLE: 1,
	/** Modifie les dégâts du sort */
	DAMAGE: 2,
	/** Modifie les dégâts de base du sort */
	BASE_DAMAGE: 3,
	/** Modifie les soins du sort */
	HEAL_BONUS: 4,
	/** Modifie le coût en PA du sort */
	AP_COST: 5,
	/** Modifie l'inverval entre deux lancés */
	CAST_INTERVAL: 6,
	/** Défini l'inverval entre deux lancés */
	CAST_INTERVAL_SET: 7,
	/** Modifie les bonus aux coups critiques du sort */
	CRITICAL_HIT_BONUS: 8,
	/** Désactive le lancé en ligne */
	CAST_LINE: 9,
	/** Désactive la ligne de vue */
	LOS: 10,
	/** Modifie le nombre de lancé maximum du sort par tour */
	MAX_CAST_PER_TURN: 11,
	/** Modifie le nombre de lancé maximum du sort par personnage */
	MAX_CAST_PER_TARGET: 12,
	/** Modifie la portée max du sort */
	RANGE: 13
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/CharacterSpellModificationTypeEnum/index.js
 ** module id = 226
 ** module chunks = 0
 **/