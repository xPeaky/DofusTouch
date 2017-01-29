module.exports = {
	/** Aucun droit */
	GUILD_RIGHT_NONE: 0,
	/** CEO de la guilde (on a tous les droits) */
	GUILD_RIGHT_BOSS: 4,
	/** Gestion des points de boost de la guilde. */
	GUILD_RIGHT_MANAGE_GUILD_BOOSTS: 2,
	/** Gestion des droits des autres joueurs. */
	GUILD_RIGHT_MANAGE_RIGHTS: 1024,
	/** Droit d'inviter de nouveaux membres dans la guilde */
	GUILD_RIGHT_INVITE_NEW_MEMBERS: 8,
	/** Droit d'exclusion de membres de la guilde */
	GUILD_RIGHT_BAN_MEMBERS: 16,
	/** Droit de gestion du % de contribution d'expérience des autres membres */
	GUILD_RIGHT_MANAGE_XP_CONTRIBUTION: 32,
	/** Droit de gestion des rangs */
	GUILD_RIGHT_MANAGE_RANKS: 64,
	/** Droit de pose de percepteurs, et de les récolter (mais pas ceux des autres) */
	GUILD_RIGHT_HIRE_TAX_COLLECTOR: 128,
	/** Droit de gestion du % de sa propre contribution d'expérience */
	GUILD_RIGHT_MANAGE_MY_XP_CONTRIBUTION: 256,
	/** Droit de récupérer les items sur les percepteurs */
	GUILD_RIGHT_COLLECT: 512,
	/** Droit d'utiliser les enclos de la guilde. */
	GUILD_RIGHT_USE_PADDOCKS: 4096,
	/** Droit de gérer les enclos de la guilde. */
	GUILD_RIGHT_ORGANIZE_PADDOCKS: 8192,
	/** Droit de réquisition des montures dans les enclos de la guilde. */
	GUILD_RIGHT_TAKE_OTHERS_MOUNTS_IN_PADDOCKS: 16384,
	/** Droit de remplacer un défenseur qui n'a pas ce droit même s'il est de niveau supérieur. */
	GUILD_RIGHT_DEFENSE_PRIORITY: 32768,
	/** Droit de récupérer les items sur les percepteurs que l'on a posé. */
	GUILD_RIGHT_COLLECT_MY_TAX_COLLECTOR: 65536,
	/** Droit de poser et régler les prismes d'alliances. */
	GUILD_RIGHT_SET_ALLIANCE_PRISM: 131072,
	/** Droit de parler dans le canal d'alliances. */
	GUILD_RIGHT_TALK_IN_ALLIANCE_CHAN: 262144
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/guildManager/GuildRightsBitEnum.js
 ** module id = 342
 ** module chunks = 0
 **/