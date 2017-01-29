/**
 * (c) 2013 - Ankama Studio and {your name here !} 
 * 
 * Complete Header in GlobalTemplate.js
 */


// package network.enums

/** Enumeration : raison pour lesquels on ne peut pas rejoindre un groupe */
module.exports = {
	/** refus sans raison précisée */
	FIGHTER_REFUSED: -1,
	/** le joueur a été accepté */
	FIGHTER_ACCEPTED: 0,
	/** challenge plein */
	CHALLENGE_FULL: 1,
	/** team pleine */
	TEAM_FULL: 2,
	/** n'appartient pas au bon alignement */
	WRONG_ALIGNMENT: 3,
	/** n'appartient pas à la bonne guilde */
	WRONG_GUILD: 4,
	/** on arrive trop tard */
	TOO_LATE: 5,
	/** on est mutant */
	MUTANT_REFUSED: 6,
	/** mauvaise map */
	WRONG_MAP: 7,
	/** on viens de respawner */
	JUST_RESPAWNED: 8,
	/** on est occupé */
	IM_OCCUPIED: 9,
	/** l'adversaire est occupé */
	OPPONENT_OCCUPIED: 10,
	/** pas contre moi même */
	FIGHT_MYSELF: 11,
	/** pas les droit suffisant */
	INSUFFICIENT_RIGHTS: 12,
	/** besoin d'être membre (abonné) */
	MEMBER_ACCOUNT_NEEDED: 13,
	/** besoin que l'adversaire soit membre (abonné) */
	OPPONENT_NOT_MEMBER: 14,
	/** equipe limité par le chef d'équipe */
	TEAM_LIMITED_BY_MAINCHARACTER: 15,
	/** multicompte non autorisé */
	MULTIACCOUNT_NOT_ALLOWED: 16,
	/** fantôme refusé */
	GHOST_REFUSED: 17,
	/** le mode restreint est actif et empêche de rejoindre le combat */
	RESTRICTED_ACCOUNT: 19,
	/** n'appartient pas à la bonne alliance */
	WRONG_ALLIANCE: 20,
	/** il n'est pas possible de lancer une agression classique dans une zone d'alliance vulnérable. */
	AVA_ZONE: 21
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/enums/FighterRefusedReasonEnum/index.js
 ** module id = 525
 ** module chunks = 0
 **/