/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les raisons possibles pour les erreurs lors d'une tentative pour rejoindre un groupe */
module.exports = {
	/** Erreur sans raison précisée. */
	PARTY_JOIN_ERROR_UNKNOWN: 0,
	/** Le joueur n'a pas été trouvé (déco ?). */
	PARTY_JOIN_ERROR_PLAYER_NOT_FOUND: 1,
	/** Le groupe n'a pas été trouvé. */
	PARTY_JOIN_ERROR_PARTY_NOT_FOUND: 2,
	/** Le groupe est plein. */
	PARTY_JOIN_ERROR_PARTY_FULL: 3,
	/** Le joueur est occupé. */
	PARTY_JOIN_ERROR_PLAYER_BUSY: 4,
	/** Le joueur est déjà dans le groupe auquel on l'invite. */
	PARTY_JOIN_ERROR_PLAYER_ALREADY_INVITED: 6,
	/** Le joueur a déjà trop de demandes d'invitations. */
	PARTY_JOIN_ERROR_PLAYER_TOO_SOLLICITED: 7,
	/** Le joueur décline l'invitation car il préfère rester dans son groupe actuel. */
	PARTY_JOIN_ERROR_PLAYER_LOYAL: 8,
	/** Le groupe ne peut-être modifié pour le moment. (ex groupe d'arène pendant un combat) */
	PARTY_JOIN_ERROR_UNMODIFIABLE: 9,
	/** Le joueur ne remplit pas les critères pour rejoindre ce groupe */
	PARTY_JOIN_ERROR_UNMET_CRITERION: 10
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/PartyJoinErrorEnum/index.js
 ** module id = 537
 ** module chunks = 0
 **/