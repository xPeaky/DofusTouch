var CellInfo = require('CellInfo');
var transformStates = require('transformStates');

/**
 * @module protocol/debug
 */

var connectionManager = require('dofusProxy/connectionManager.js');
var debugLayer;

/**
 * @event module:protocol/debug.client_DebugHighlightCellsMessage
 */
connectionManager.on('DebugHighlightCellsMessage', function (msg) {
	// for now, we don't support custom colors
	var cellInfos = {};
	var distance = 0;

	for (var i = 0; i < msg.cells.length; i++) {
		var cellId = msg.cells[i];
		cellInfos[cellId] =
			new CellInfo(
				cellId,
				distance,
				transformStates.fullRed
			);
	}

	window.background.removeGridLayer(debugLayer);
	debugLayer = window.background.addGridAnimation(cellInfos);
	window.setTimeout(function () {
		window.background.removeGridLayer(debugLayer);
	}, 5000);
	// the below methods don't appear to be called, so hacking in the removal.
});

/**
 * @event module:protocol/debug.client_DebugClearHighlightCellsMessage
 */
connectionManager.on('DebugClearHighlightCellsMessage', function () {
	if (debugLayer) {
		window.background.removeGridLayer(debugLayer);
	}
});

connectionManager.on('DebugInClientMessage', function (msg) {
	window.gui.transmitMessage(msg);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-debug.js
 ** module id = 64
 ** module chunks = 0
 **/