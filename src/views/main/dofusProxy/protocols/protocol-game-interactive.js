/**
 * @module protocol/interactive
 */
var connectionManager = require('dofusProxy/connectionManager.js');

/**
 * @event module:protocol/interactive.client_InteractiveUseErrorMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.elemId - interactive element id
 * @param {number} msg.skillInstanceUid - uid of the skill instance associated to the object
 */
connectionManager.on('InteractiveUseErrorMessage', function (msg) {
	window.isoEngine.onInteractiveUseErrorMessage(msg);
});

/**
 * @event module:protocol/interactive.client_InteractiveUsedMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.entityId - id of actor using interactive
 * @param {number} msg.elemId   - interactive element id
 * @param {number} msg.skillId  - skill id used
 * @param {number} msg.duration - use duration in 1/10 seconds (if 0, ack is not required)
 * @param {string} msg._useAnimation - (enriched) animation base name actor have to play.
 */
connectionManager.on('InteractiveUsedMessage', function (msg) {
	window.isoEngine.interactiveUseStart(msg);
	window.gui.transmitMessage(msg);
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @event module:protocol/interactive.client_InteractiveUseEndedMessage
 *
 * @param {object} msg - msg
 * @param {number} msg.elemId  - interactive element id
 * @param {number} msg.skillId - skill id
 */
connectionManager.on('InteractiveUseEndedMessage', function (msg) {
	window.isoEngine.interactiveUseEndedMessage(msg);
	window.gui.transmitMessage(msg);
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @event module:protocol/interactive.client_InteractiveMapUpdateMessage
 *
 * @param {object} msg - msg
 * @param {Object[]} msg.interactiveElements - list of interactive elements in the map
 *
 * @param {number}   msg.interactiveElements[*].elementId      - interactive element id
 * @param {number}   msg.interactiveElements[*].elementTypeId  - interactive element type (-1 if none)
 * @param {Object[]} msg.interactiveElements[*].enabledSkills  - visible skills list
 * @param {Object[]} msg.interactiveElements[*].disabledSkills - visible but inactive skills list
 */
connectionManager.on('InteractiveMapUpdateMessage', function (msg) {
	window.isoEngine.updateInteractiveElements(msg.interactiveElements);
});


/**
 * @event module:protocol/interactive.client_InteractiveElementUpdatedMessage
 * @desc  update data of an interactive element
 *
 * @param {object} msg - msg
 * @param {number}   msg.elementId      - interactive element id
 * @param {number}   msg.elementTypeId  - interactive element type (-1 if none)
 * @param {Object[]} msg.enabledSkills  - visible skills list
 * @param {Object[]} msg.disabledSkills - visible but inactive skills list
 */
connectionManager.on('InteractiveElementUpdatedMessage', function (msg) {
	window.isoEngine.updateInteractiveElements([msg.interactiveElement]);
});


/**
 * @event module:protocol/interactive.client_StatedMapUpdateMessage
 *
 * @param {object} msg - msg
 * @param {Object[]} msg.statedElements - updated stated element
 * @param {number} msg.statedElements[*].elementId     - element id
 * @param {number} msg.statedElements[*].elementCellId - element position
 * @param {number} msg.statedElements[*].elementState  - element state
 */
connectionManager.on('StatedMapUpdateMessage', function (msg) {
	window.isoEngine.updateStatedElements(msg.statedElements);
});

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** @event module:protocol/interactive.client_StatedElementUpdatedMessage
 *
 * @param {object} msg - msg
 * @param {Object} msg.statedElement - updated stated element
 * @param {number} msg.statedElement.elementId     - element id
 * @param {number} msg.statedElement.elementCellId - element position
 * @param {number} msg.statedElement.elementState  - element state
 */
connectionManager.on('StatedElementUpdatedMessage', function (msg) {
	window.isoEngine.updateStatedElements([msg.statedElement]);
});



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/main/dofusProxy/protocols/protocol-game-interactive.js
 ** module id = 128
 ** module chunks = 0
 **/