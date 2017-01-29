/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les raisons invoquées pour refuser à un joueur de se connecter au serveur. */
module.exports = {
	/** La connexion est refusée en raison de l'état du serveur. */
	SERVER_CONNECTION_ERROR_DUE_TO_STATUS: 0,
	/** Le connexion est refusée, mais le serveur n'explique pas pourquoi (cause inconnue). */
	SERVER_CONNECTION_ERROR_NO_REASON: 1,
	/** Serveur interdit à ce compte. */
	SERVER_CONNECTION_ERROR_ACCOUNT_RESTRICTED: 2,
	/** La communauté associé au compte est invalide pour ce serveur. */
	SERVER_CONNECTION_ERROR_COMMUNITY_RESTRICTED: 3,
	/** Le lieu de connexion interdit l'accès à ce serveur. */
	SERVER_CONNECTION_ERROR_LOCATION_RESTRICTED: 4,
	/** Actuellement, seuls les abonnés peuvent accéder au serveur. */
	SERVER_CONNECTION_ERROR_SUBSCRIBERS_ONLY: 5,
	/** Seuls les joueurs ayant déjà des personnages sur ce serveur peuvent s'y connecter. */
	SERVER_CONNECTION_ERROR_REGULAR_PLAYERS_ONLY: 6
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/ServerConnectionErrorEnum/index.js
 ** module id = 482
 ** module chunks = 0
 **/