/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les erreurs d'échange */
module.exports = {
	/** La requête d'échange ne peut pas aboutir */
	REQUEST_IMPOSSIBLE: 1,
	/** La requête d'échange ne peut pas aboutir car la cible est occupée */
	REQUEST_CHARACTER_OCCUPIED: 2,
	/** La requête d'échange ne peut pas aboutir car l'objet permetant de faire le craft n'est pas équipé */
	REQUEST_CHARACTER_JOB_NOT_EQUIPED: 3,
	/** La requête d'échange ne peut pas aboutir, la machine est trop loin */
	REQUEST_CHARACTER_TOOL_TOO_FAR: 4,
	/** La requête d'échange ne peut pas aboutir, le joueur est 'overloaded?' */
	REQUEST_CHARACTER_OVERLOADED: 5,
	/** La requête d'échange ne peut pas aboutir, le joueur n est pas enregistré */
	REQUEST_CHARACTER_NOT_SUSCRIBER: 6,
	/** La requête d'échange ne peut pas aboutir, le joueur est en mode restreint. */
	REQUEST_CHARACTER_RESTRICTED: 7,
	/** Erreur lors d'un achat */
	BUY_ERROR: 8,
	/** Erreur lors d'une vente */
	SELL_ERROR: 9,
	/** Erreur lors d'une transaction avec une ferme */
	MOUNT_PADDOCK_ERROR: 10,
	/** Erreur lors d'une recherche dans l'hotel de vente */
	BID_SEARCH_ERROR: 11
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/ExchangeErrorEnum/index.js
 ** module id = 657
 ** module chunks = 0
 **/