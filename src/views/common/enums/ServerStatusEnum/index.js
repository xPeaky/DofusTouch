/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Les différents états dans lesquels un serveur de jeu peut se trouver. */
module.exports = {
	/** Le status du serveur n'est pas encore connu. */
	STATUS_UNKNOWN: 0,
	/** Le serveur est hors ligne. */
	OFFLINE: 1,
	/** Le serveur est en train de démarrer. */
	STARTING: 2,
	/** Le serveur est en ligne et accepte les connexions. */
	ONLINE: 3,
	/** Le serveur est en ligne mais n'accepte pas les connexions. */
	NOJOIN: 4,
	/** Le serveur est bloqué car en cours de sauvegarde. */
	SAVING: 5,
	/** Le serveur est en train de s'éteindre. */
	STOPING: 6,
	/** Le serveur est en ligne mais est complet. */
	FULL: 7
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/ServerStatusEnum/index.js
 ** module id = 480
 ** module chunks = 0
 **/