/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les erreurs retournées à la suppression de perso */
module.exports = {
	/** Impossible de supprimer le personnage, sans raison précisée. */
	DEL_ERR_NO_REASON: 1,
	/** Impossible de supprimer le personnage, trop de personnages supprimés dans la période. */
	DEL_ERR_TOO_MANY_CHAR_DELETION: 2,
	/** La réponse secrète fournie par le joueur est erronnée, elle ne correspond pas à celle associée au compte. */
	DEL_ERR_BAD_SECRET_ANSWER: 3,
	/** Il est impossible de supprimer un perso lorsque la connexion n'est pas sécurisée. */
	DEL_ERR_RESTRICED_ZONE: 4
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/CharacterDeletionErrorEnum/index.js
 ** module id = 694
 ** module chunks = 0
 **/