/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Contient les différentes raisons possibles pour l'échec d'une authentification. */
module.exports = {
	/** Version du client invalide. */
	BAD_VERSION: 1,
	/** Le nom d'utilisateur ou le mot de passe est incorrect. */
	WRONG_CREDENTIALS: 2,
	/** Compte banni. */
	BANNED: 3,
	/** Compte éjecté. */
	KICKED: 4,
	/** Compte en maintenance. */
	IN_MAINTENANCE: 5,
	/** Trop de connexions depuis cette IP. */
	TOO_MANY_ON_IP: 6,
	/** Attente trop longue, (d'un retour du webservice) */
	TIME_OUT: 7,
	/** Connexion depuis une plage d'IP blacklistée */
	BAD_IPRANGE: 8,
	/** Identifiants réinitialisés */
	CREDENTIALS_RESET: 9,
	/** Adresse email non validée */
	EMAIL_UNVALIDATED: 10,
	/** Service momentanément indisponible */
	SERVICE_UNAVAILABLE: 53,
	/** Authentification échouée pour une raison inconnue. */
	UNKNOWN_AUTH_ERROR: 99,
	/** Undefined */
	SPARE: 100
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/IdentificationFailureReasonEnum/index.js
 ** module id = 53
 ** module chunks = 0
 **/