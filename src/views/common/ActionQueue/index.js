var staticContent = require('staticContent');

// List of interactive type ids that can be added only at the end of a queue
var endOfQueueElementTypes = null;

/**
 * @class
 * @classdesc Stack callbacks to execute in the order they have been queued.
 */
function ActionQueue() {
	this._queue = [];
	this._actionMap = {};
	this._isActive = false;
	this._currentActionId = null;
	this._endOfQueueOnly = false;
}
module.exports = ActionQueue;

/**
 * @desc  Retrieve interactive types data
 */
ActionQueue.prototype.initialize = function () {
	if (endOfQueueElementTypes) { return; }
	staticContent.getAllDataMap('Interactives', function (error, interactives) {
		if (error) {
			console.error(new Error('ActionQueue.staticContent.getAllDataMap: ' + error));
			return;
		}
		endOfQueueElementTypes = {};
		for (var interactiveId in interactives) {
			// interactives with action id 1 are the only queueables in the middle of a queue
			if (interactives[interactiveId].actionId !== 1) {
				endOfQueueElementTypes[interactiveId] = true;
			}
		}
		// a lot of interactive elements (like most building doors) have an elementTypeId of -1
		// they are also queuable only at the end of a chain of actions
		endOfQueueElementTypes['-1'] = true;
	});
};

/**
 * @desc  Enqueue an action and execute it if there is no other action enqueued
 *
 * @param  {string}   actionId        - an action identifier to avoid adding two times the same one
 *                                      (e.g. id of the interactive element if the action deals with an interactive)
 * @param  {bool}     endOfQueueOnly  - if this action can only be at the end of a queue
 * @param  {Function} action          - function to execute when it will be dequeued
 *
 * @return  {boolean} true if the action could be enqueued, false otherwise
 */
ActionQueue.prototype.enqueue = function (actionId, endOfQueueOnly, action) {
	if (!this.canQueueMore()) {
		return false;
	}
	if (!this._isActive) {
		this._isActive = true;
		this._actionMap[actionId] = true;
		this._currentActionId = actionId;
		this._endOfQueueOnly = endOfQueueOnly;
		action();
		return true;
	}
	// to avoid enqueuing identical actions
	if (this._actionMap[actionId]) {
		return true;
	}
	this._queue.push({
		actionId: actionId,
		action: action,
		endOfQueueOnly: endOfQueueOnly
	});
	this._actionMap[actionId] = true;
	return true;
};

/**
 * @desc  Enqueue an action dealing with an interactive
 *
 * @param  {string}   interactiveId     - id of the interactive
 * @param  {number}   interactiveTypeId - type id of the interactive
 * @param  {Function} action            - function to execute when it will be dequeued
 *
 * @return  {boolean} true if the action could be enqueued, false otherwise
 */
ActionQueue.prototype.enqueueInteractive = function (interactiveId, interactiveTypeId, action) {
	var endOfQueueOnly = (endOfQueueElementTypes && endOfQueueElementTypes[interactiveTypeId]) || false;
	return this.enqueue(interactiveId, endOfQueueOnly, action);
};

/**
 * @desc  Dequeue an action and execute the next one or clear the queue if there is no action left
 *        We check against the id of the element to be sure we are deuqueuing the action linked to the current element
 *        If the action to dequeue is not the current element, nothing is done
 *
 * @param  {number} actionId - actionId defined when enqueued
 */
ActionQueue.prototype.dequeue = function (actionId) {
	if (!this._isActive) {
		return;
	}
	if (!this._isCurrentAction(actionId)) {
		// We might want to cancel the queue entirely if we try to dequeue a non-current element
		return;
	}
	delete this._actionMap[actionId];
	var next = this._queue.shift();
	if (!next) {
		this.clear();
		return;
	}
	this._currentActionId = next.actionId;
	this._endOfQueueOnly = next.endOfQueueOnly;
	next.action();
};

/**
 * @desc  Check if a new action can be queued
 *
 * @return  {boolean} true if the action can be queued, false otherwise
 */
ActionQueue.prototype.canQueueMore = function () {
	// queue is empty
	if (!this._isActive) {
		return true;
	}

	// if the last element in the queue is only valid at the end of a queue, we cannot queue anything else after
	var canQueueMore;
	if (this._queue.length > 0) {
		canQueueMore = !this._queue[this._queue.length - 1].endOfQueueOnly;
	} else {
		canQueueMore = !this._endOfQueueOnly;
	}

	return canQueueMore;
};

/**
 * @desc  Check if actions are currently queued
 *
 * @return  {boolean} true if actions are queued, false otherwise
 */
ActionQueue.prototype.isActive = function () {
	return this._isActive;
};

/**
 * @private
 *
 * @desc  Check if an element id corresponds to the element id of the action currently executing
 *
 * @return  {boolean} true the element id is the one of the action currently executing, false otherwise
 */
ActionQueue.prototype._isCurrentAction = function (actionId) {
	return this._currentActionId === actionId;
};

/**
 * @desc  Clear the action queue, any queued actions will not be executed
 */
ActionQueue.prototype.clear = function () {
	this._queue = [];
	this._actionMap = {};
	this._isActive = false;
	this._currentActionId = null;
	this._endOfQueueOnly = false;
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/ActionQueue/index.js
 ** module id = 1047
 ** module chunks = 0
 **/