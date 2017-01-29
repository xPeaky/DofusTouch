/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Status d'agréssabilité du joueur */
module.exports = {
	/** Pas agressable (PvP et AvA désactivés) */
	NON_AGGRESSABLE: 0,
	/** Pvp actif et agressable */
	PvP_ENABLED_AGGRESSABLE: 10,
	/** Pvp actif mais non agressable (ex: zone pacifiste) */
	PvP_ENABLED_NON_AGGRESSABLE: 11,
	/** AvA actif et agressable dans la sous-zone */
	AvA_ENABLED_AGGRESSABLE: 20,
	/** AvA actif et non agressable  */
	AvA_ENABLED_NON_AGGRESSABLE: 21,
	/** AvA actif mais disqualifié dans la sous-zone */
	AvA_DISQUALIFIED: 22,
	/** AvA actif, agressable dans la sous-zone, mais pas encore dans le compte du KotH */
	AvA_PREQUALIFIED_AGGRESSABLE: 23
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/AggressableStatusEnum/index.js
 ** module id = 334
 ** module chunks = 0
 **/