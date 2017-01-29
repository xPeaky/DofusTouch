/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les descriptions des erreurs concernant les percepteurs */
module.exports = {
	/** Erreur sans raison précisée. */
	TAX_COLLECTOR_ERROR_UNKNOWN: 0,
	/** Il n'y a pas de perco sur la map. */
	TAX_COLLECTOR_NOT_FOUND: 1,
	/** Le perco n'appartient pas à votre guilde. */
	TAX_COLLECTOR_NOT_OWNED: 2,
	/** Vous n'avez pas les droits requis (droit de guilde, ou droits globaux). */
	TAX_COLLECTOR_NO_RIGHTS: 3,
	/** Vous avez atteint le maximum de percos. */
	TAX_COLLECTOR_MAX_REACHED: 4,
	/** Il y a déjà un perco sur la map. */
	TAX_COLLECTOR_ALREADY_ONE: 5,
	/** Vous ne pouvez pas encore poser de perco. */
	TAX_COLLECTOR_CANT_HIRE_YET: 6,
	/** Vous ne pouvez poser de perco ici. */
	TAX_COLLECTOR_CANT_HIRE_HERE: 7,
	/** Vous n'avez pas assez de sous. */
	TAX_COLLECTOR_NOT_ENOUGH_KAMAS: 8
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/TaxCollectorErrorReasonEnum/index.js
 ** module id = 343
 ** module chunks = 0
 **/