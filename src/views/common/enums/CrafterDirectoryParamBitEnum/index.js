/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les valeurs des bits dans le champs décrivant les options dans la liste des métiers */
module.exports = {
	/** Aucune option de craft particulière. */
	CRAFT_OPTION_NONE: 0,
	/** Craft payant */
	CRAFT_OPTION_NOT_FREE: 1,
	/** Payant mais gratuit en cas d'échec (implique CRAFT_OPTION_NOT_FREE). */
	CRAFT_OPTION_NOT_FREE_EXCEPT_ON_FAIL: 2,
	/** Il faut fournir les resources pour le craft. */
	CRAFT_OPTION_RESOURCES_REQUIRED: 4
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/CrafterDirectoryParamBitEnum/index.js
 ** module id = 902
 ** module chunks = 0
 **/