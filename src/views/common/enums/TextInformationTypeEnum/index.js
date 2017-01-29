/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : Type de message d'info pour le joueur */
module.exports = {
	/** Un message d'information. */
	TEXT_INFORMATION_MESSAGE: 0,
	/** Un message d'erreur. */
	TEXT_INFORMATION_ERROR: 1,
	/** Un message concernant le PvP. */
	TEXT_INFORMATION_PVP: 2,
	/** Réservé pour les messages concernant les logs de combat (uniquement côté client). */
	TEXT_INFORMATION_FIGHT_LOG: 3,
	/** Réservé pour les messages de pop-up. */
	TEXT_INFORMATION_POPUP: 4,
	/** Réservé pour les messages venant des objects vivants */
	TEXT_LIVING_OBJECT: 5,
	/** Réservé pour les messages qui font parler les entités (pretre, npc ,porte, etc....) */
	TEXT_ENTITY_TALK: 6,
	/** Réservé pour les messages de combat (serveur). */
	TEXT_INFORMATION_FIGHT: 7
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/TextInformationTypeEnum/index.js
 ** module id = 629
 ** module chunks = 0
 **/