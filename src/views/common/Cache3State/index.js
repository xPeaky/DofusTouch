var DoublyList = require('container-doublylist');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Element management types allows for different memory management strategies:
 * permanent:  Element is added to the cache permanently
 * archivable: Element can be archived
 * throwable:  Element cannot be archived, it will be removed instead of being archived
 */
var MANAGEMENT_TYPES = {
	permanent:  0,
	archivable: 1,
	throwable:  2
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Element Handle containts all the properties necessary for the cache to manage the element
 *
 * @param {Object} element    - Cached element
 * @param {Object} memorySize - Size of the element in memory
 * @param {string} id         - Id of the element
 * @param {String} type       - Type used for memory management strategy
 */
function ElementHandle(cache, element, memorySize, id, type) {
	this.id = id;

	// Cache holding the element
	this.cache = cache;

	// Handled element
	this.element = element;

	// Size of the element in the cache
	this.memorySize = memorySize;

	// Element type, for caching strategy
	this.type = MANAGEMENT_TYPES[type];

	// Number of locks added to the element
	this.nLocks = 0;

	// Reference to its node in the cache
	this.reference = null;

	// Additional attachment to the element handle, for convenience purpose
	this.attachment = null;
}

ElementHandle.prototype.isPermanent = function () {
	return (this.type === MANAGEMENT_TYPES.permanent);
};

ElementHandle.prototype._hold = function () {
	if (this.type === MANAGEMENT_TYPES.permanent) {
		return this;
	}

	this.nLocks += 1;
	this.cache._holdElement(this);
	return this;
};

ElementHandle.prototype.release = function () {
	if (this.type === MANAGEMENT_TYPES.permanent) {
		return this;
	}

	this.nLocks -= 1;
	if (this.nLocks === 0) {
		this.cache._releaseElement(this);
	} else if (this.nLocks < 0) {
		console.error(new Error('[ElementHandle.release] Number of locks is negative: ' + this.id));
	}
};

ElementHandle.prototype.isFree = function () {
	return this.nLocks === 0;
};

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Holds a list of elements being used by the cache
 *
 * @param {number} memoryAllocated  - Total memory allocated
 * @param {number} onElementRemoved - Callback triggered whenever an element is removed from the cache
 */

function Cache3State(memoryAllocated, onElementRemoved) {
	this.elementsById = {};

	// If an element is permanent it is not necessary to add it to the cache
	// As it will never be removed it is not necessary to keep track of its last use
	this.actives  = new DoublyList();
	this.archives = new DoublyList();

	this.memoryUsed = 0;
	this.memoryAllocated = memoryAllocated;

	this.onElementRemoved = onElementRemoved || null;

	this.unidentifiedElementsCount = 0;

	this.addCount = 0;
	this.removeCount = 0;
}
module.exports = Cache3State;

Cache3State.prototype._clean = function () {
	// Removing elements to satisfy the memory constraint
	var handleRef = this.archives.first;
	while (handleRef !== null && this.memoryUsed > this.memoryAllocated) {
		var handle = handleRef.object;
		handleRef = handleRef.next;
		if (handle.nLocks <= 0) {
			this._removeElement(handle);
		}
	}
};

Cache3State.prototype.log = function () {
	console.log('***** Cache Stats *****');
	console.log('  Actives', this.actives.length);
	console.log('  Archives', this.archives.length);
	console.log('  Total', Object.keys(this.elementsById).length);
	console.log('  Usage (units)', this.memoryUsed);
	console.log('  Usage (percentage)', (100 * this.memoryUsed / this.memoryAllocated).toFixed(0), '%');
	console.log('  Elements', this.elementsById);
};

Cache3State.prototype._holdElement = function (handle) {
	if (handle.type !== MANAGEMENT_TYPES.permanent) { // Nothing to do if element is permanent
		if (handle.reference.container === this.actives) {
			// Element already in the list of active elements
			// Putting image at the end of the list
			// O(1)
			this.actives.moveToTheEnd(handle.reference);
		} else {
			// Moving element from archives to actives
			// O(1)
			this.archives.removeByReference(handle.reference);
			handle.reference = this.actives.addBack(handle);
		}
	}
};

Cache3State.prototype._releaseElement = function (handle) {
	this._archiveElement(handle);
};

Cache3State.prototype._archiveElement = function (handle) {
	// Moving the element from active to archived
	if (handle.reference.container !== this.actives) {
		console.warn('[Cache3State.archiveElement] The element cannot be archived:', handle.id);
		return;
	}

	if (handle.type === MANAGEMENT_TYPES.throwable) {
		this._removeElement(handle);
	} else {
		this.actives.removeByReference(handle.reference);
		handle.reference = this.archives.addBack(handle);
		this._clean();
	}
};

Cache3State.prototype._addElement = function (handle) {
	// Adding to element map
	this.elementsById[handle.id] = handle;

	// Adding to memory count
	this.memoryUsed += handle.memorySize;

	// Making sure the cache does not use too much memory
	this._clean();

	if (handle.type !== MANAGEMENT_TYPES.permanent) {
		handle.reference = this.actives.addBack(handle);
	}

	this.addCount += 1;
};

Cache3State.prototype.addAndHoldElement = function (element, memorySize, id, type, replace) {
	var isIdentified = Boolean(id);
	if (isIdentified === false) {
		id = 'unidentified' + String(this.unidentifiedElementsCount++);
	}

	if (type === undefined || type === null) {
		type = isIdentified ? 'archivable' : 'throwable';
	}

	var handle = this.elementsById[id];
	if (handle !== undefined) {
		if (replace) {
			if (handle.isFree() === false) {
				console.warn('[Cache3State.addElement] Trying to replace a locked element', id);
				return handle._hold();
			}

			// Element already present
			// Removing it so that it can be replaced
			this._removeElement(handle);
		} else {
			if (handle.type !== MANAGEMENT_TYPES[type]) {
				console.warn('[Cache3State.addElement] Trying to change type of an exisiting element', id);
			}

			return handle._hold();
		}
	}

	handle = new ElementHandle(this, element, memorySize, id, type);
	this._addElement(handle);

	return handle._hold();
};

Cache3State.prototype.holdElement = function (elementId) {
	var handle = this.elementsById[elementId];
	if (handle !== undefined) {
		return handle._hold();
	}
};

Cache3State.prototype.useElement = function (elementId) {
	var handle = this.elementsById[elementId];
	if (handle !== undefined) {
		return handle;
	}
};

Cache3State.prototype._removeElement = function (handle) {
	// Removing from element map
	delete this.elementsById[handle.id];

	// Removing from memory count
	this.memoryUsed -= handle.memorySize;

	if (handle.type !== MANAGEMENT_TYPES.permanent) {
		// Removing from list
		if (handle.reference.container === this.actives) {
			handle.reference = this.actives.removeByReference(handle.reference);
		} else {
			handle.reference = this.archives.removeByReference(handle.reference);
		}
	}


	// Applying callback
	if (this.onElementRemoved !== null) {
		this.onElementRemoved(handle.element);
	}

	this.removeCount += 1;
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/common/Cache3State/index.js
 ** module id = 250
 ** module chunks = 0
 **/