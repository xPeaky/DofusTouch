/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les erreurs retournées à la création de perso */
module.exports = {
	/** Personnage créé. */
	OK: 0,
	/** Impossible de créer le personnage, sans raison précisée. */
	ERR_NO_REASON: 1,
	/** Impossible de créer le personnage, le nom est invalide. */
	ERR_INVALID_NAME: 2,
	/** Impossible de créer le personnage, le nom est déjà utilisé. */
	ERR_NAME_ALREADY_EXISTS: 3,
	/** Impossible de créer le personnage, limite de personnages autorisés sur ce compte atteinte. */
	ERR_TOO_MANY_CHARACTERS: 4,
	/** Impossible de créer le personnage, ce choix n'est pas autorisé (ex Panda réservé aux abonnés, ou classes en exclusivité). */
	ERR_NOT_ALLOWED: 5,
	/** Le serveur n'autorise la création de personnages qu'aux joueurs qui en ont déjà. */
	ERR_NEW_PLAYER_NOT_ALLOWED: 6,
	/** Il est impossible de créer un perso lorsque la connexion n'est pas sécurisée. */
	ERR_RESTRICED_ZONE: 7
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/CharacterCreationResultEnum/index.js
 ** module id = 178
 ** module chunks = 0
 **/