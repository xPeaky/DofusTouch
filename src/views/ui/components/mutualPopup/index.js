var windowsManager = require('windowsManager');

var confirmPopupTexts;
var cancelPopupTexts;
var confirmPopupActions;
var cancelPopupAction;

var sourceName;
var myId;
var myName;
var isSource;

function openPopup(mustKeepDialog) {
	var ConfirmWindowEnums = windowsManager.getWindow('confirm').actionsEnum;

	function openCancelPopup() {
		var data = {
			title: cancelPopupTexts.title,
			message: cancelPopupTexts.message,
			cb: function () {
				if (cancelPopupAction) {
					cancelPopupAction();
				}
			}
		};
		windowsManager.getWindow('cancel').update(data, { keepDialog: mustKeepDialog });
		windowsManager.openDialog(['cancel']);
	}

	function openConfirmAndIgnorePopup() {
		var data = {
			title: confirmPopupTexts.title,
			message: confirmPopupTexts.message,
			cb: function (result) {
				if (result === ConfirmWindowEnums.NO) {
					if (confirmPopupActions.refuse) {
						confirmPopupActions.refuse();
					}
				} else if (result === ConfirmWindowEnums.IGNORE) {
					if (confirmPopupActions.ignore) {
						confirmPopupActions.ignore();
					}
				} else {
					if (confirmPopupActions.confirm) {
						confirmPopupActions.confirm();
					}
				}
			}
		};
		// TODO: this popup system should have addButton function...
		windowsManager.getWindow('confirm').update(data, { ignoreEnable: true, keepDialog: mustKeepDialog });
		windowsManager.openDialog(['confirm']);
	}

	if (isSource) {
		openCancelPopup();
	} else {
		openConfirmAndIgnorePopup();
	}
}

/**
 * Open the popup when someone wants to Exchange/Multicraft with you.
 */
exports.askingExchangePopup = function () {
	confirmPopupActions = {
		confirm: function () {
			window.dofus.sendMessage('ExchangeAcceptMessage');
		},
		refuse: undefined,
		ignore: function () {
			window.dofus.sendMessage('IgnoredAddRequestMessage', {
				name: sourceName,
				session: true
			});
		}
	};
	cancelPopupAction = undefined;
	openPopup(true);
};

/**
 * Open the popup when someone wants to challenge you.
 */
exports.askingChallengePopup = function (fightId) {
	function accept() {
		window.dofus.sendMessage('GameRolePlayPlayerFightFriendlyAnswerMessage', { fightId: fightId, accept: true });
	}
	function refuse() {
		window.dofus.sendMessage('GameRolePlayPlayerFightFriendlyAnswerMessage', { fightId: fightId, accept: false });
	}
	function ignore() {
		refuse();
		window.dofus.sendMessage('IgnoredAddRequestMessage', { name: sourceName, session: true });
	}
	confirmPopupActions = {
		confirm: accept,
		refuse: refuse,
		ignore: ignore
	};
	cancelPopupAction = refuse;
	openPopup(false);
};

exports.closingChallengePopup = function (isSource) {
	// On Ankama side, they check if we are waiting for the received fightId
	// But we should not have more than one fight request at the same time.
	var popupName = isSource ? 'cancel' : 'confirm';
	var popup = windowsManager.getWindow(popupName);
	windowsManager.close(popup.id);
};

exports.setupCancelPopupTexts = function (cancelPopupText) {
	cancelPopupTexts = cancelPopupText;
};

exports.setupConfirmPopupTexts = function (confirmPopupText) {
	confirmPopupTexts = confirmPopupText;
};

/**
 * Setup the popup when someone want to Exchange/Multicraft with you.
 * @param {string} targetId - The id of the player you want to exchange with
 * @param {number} sourceId - The id that usually come from the initialisation message
 *                          - (Like 'ExchangeRequestedTradeMessage': the param source)
 */
exports.setupNames = function (targetId, sourceId) {
	var playerData = window.gui.playerData;
	myId = playerData.id;
	myName = playerData.characterBaseInformations.name;

	isSource = sourceId === myId;

	var otherActor = window.actorManager.getActor(isSource ? targetId : sourceId);
	if (!otherActor) {
		return null;
	}

	var otherActorName = otherActor.data.name;
	sourceName = isSource ? myName : otherActorName;
	var targetName = isSource ? otherActorName : myName;

	return { sourceName: sourceName, targetName: targetName };
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/mutualPopup/index.js
 ** module id = 463
 ** module chunks = 0
 **/