/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les raisons invoquées pour refuser le pseudonyme demandé par le joueur. */
module.exports = {
	/** Pseudonyme refusé car déjà utilisé. */
	ALREADY_USED: 1,
	/** Pseudonyme refusé car déjà identique au login (nom de compte). */
	SAME_AS_LOGIN: 2,
	/** Pseudonyme refusé car trop semblable au login (nom de compte). */
	TOO_SIMILAR_TO_LOGIN: 3,
	/** Pseudonyme refusé car non conforme à la charte (ex. caractères invalides). */
	INVALID_NICK: 4,
	/** Pseudonyme refusé pour une raison non précisée. */
	UNKNOWN_NICK_ERROR: 99
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/NicknameErrorEnum/index.js
 ** module id = 1002
 ** module chunks = 0
 **/