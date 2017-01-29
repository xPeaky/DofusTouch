exports.highlightCells = function () {
	for (var challengeIndex in window.gui.challengeIndicator.challenges) {
		var challenge = window.gui.challengeIndicator.challenges[challengeIndex];
		var challengeId = challenge.data.challengeId;
		switch (challengeId) {
			case 3:
			case 4:
			case 32:
			case 34:
			case 35:
				if (challenge.data._targetFighter) {
					var cellId = challenge.data._targetFighter.data.disposition.cellId;
					window.gui.pingSystem.addPingPicto(cellId, 'attack');
				}
				break;
			default:
				// we used to do
				// window.isoEngine.mapRenderer.addArrowsOnCellsOneShot(msg.targetCells, 0, 0, 'up');
		}
	}
};





/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/ChallengeIndicator/challengeMap.js
 ** module id = 439
 ** module chunks = 0
 **/