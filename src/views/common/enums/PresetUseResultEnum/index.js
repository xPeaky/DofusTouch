/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Le code de retour pour l'utilisation d'une configuration d'inventaire */
module.exports = {
	/** La configuration d'inventaire a été équipée */
	PRESET_USE_OK: 1,
	/** La configuration d'inventaire a été équipée en partie, mais il manque des objets */
	PRESET_USE_OK_PARTIAL: 2,
	/** Une erreur non précisée */
	PRESET_USE_ERR_UNKNOWN: 3,
	/** Impossible en raison des critérions */
	PRESET_USE_ERR_CRITERION: 4,
	/** Identifiant de preset invalide */
	PRESET_USE_ERR_BAD_PRESET_ID: 5
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/PresetUseResultEnum/index.js
 ** module id = 532
 ** module chunks = 0
 **/