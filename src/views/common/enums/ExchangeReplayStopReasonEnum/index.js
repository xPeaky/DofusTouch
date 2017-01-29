/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les raisons pour lesquelles un craft automatique (enchaînement) peut s'arrêter */
module.exports = {
	/** Tous les crafts demandés ont été réalisés */
	STOPPED_REASON_OK: 1,
	/** Stoppé par l'utilisateur */
	STOPPED_REASON_USER: 2,
	/** Il n'y a plus assez d'ingrédients pour continuer */
	STOPPED_REASON_MISSING_RESSOURCE: 3,
	/** Le craft précédent était impossible */
	STOPPED_REASON_IMPOSSIBLE_CRAFT: 4
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/ExchangeReplayStopReasonEnum/index.js
 ** module id = 462
 ** module chunks = 0
 **/