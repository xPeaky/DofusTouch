/**
 * @module WuiDom
 */

var inherit = require('util').inherits;
var EventEmitter = require('events').EventEmitter;
var domEvents = require('./domEvents.js');
require('dom-shims');

var cType = {
	EMPTY: null,
	WUI: 'wui',
	TEXT: 'text',
	HTML: 'html'
};

var concat = Array.prototype.concat;
function toArray(args) {
	return concat.apply([], args).filter(Boolean);
}


/**
 * HTML creation helper
 * @private
 * @param {string} tagName
 * @param {Object} [options]
 */
function createHtmlElement(tagName, options) {
	var key, elm = document.createElement(tagName);

	if (options && options.attr) {
		for (key in options.attr) {
			elm.setAttribute(key, options.attr[key]);
		}
	}

	return elm;
}


/**
 * @constructor
 * @augments EventEmitter
 * @param {string} tagName
 * @param {Object} [options]
 */
function WuiDom(tagName, options) {
	EventEmitter.call(this);
	this._elementIsVisible = true;
	this._currentTextContent = null;
	this.rootElement = null;
	this._text = null;
	this._name = null;
	this._childrenList = [];
	this._childrenMap = {};
	this._contentType = cType.EMPTY;
	this._parent = null;
	if (tagName) {
		this._assign(tagName, options);
	}
}

inherit(WuiDom, EventEmitter);
module.exports = WuiDom;


/**
 * Makes the given element the rootElement for this component.
 * If instead of an HTML element, a tagName and options are given, the element is created and assigned.
 * The logic for HTML creation follows the rules of the private createHtmlElement function.
 * @param {string} tagName
 * @param {Object} [options]
 * @param {Boolean} [options.hidden=false] - Allow to hide the DOM on creation
 * @param {string} [options.name] - Set identifier to be found by it's parent (see #getChild)
 * @param {Array} [options.className] - List of class name to set on the DOM
 * @param {Object} [options.style] - CSS Style to apply to the DOM
 * @param {String} [options.text] - Set a text in the DOM (see #setText)
 * @param {Object} [options.attr] - Set the Html attribute of the DOM
 * @private
 */
WuiDom.prototype._assign = function (tagName, options) {
	if (this.rootElement) {
		throw new Error('WuiDom has already an element assigned');
	}

	if (typeof tagName === 'string') {
		// if tagName is a real tag name, create the HTML Element with it

		this.rootElement = createHtmlElement(tagName, options);
		if (options && options.hasOwnProperty('text')) {
			this.setText(options.text);
		}
	} else if (tagName instanceof window.Element) {
		// the first passed argument already is a real HTML Element
		this.rootElement = tagName;
	} else {
		throw new Error('WuiDom.assign requires the given argument to be a DOM Element or tagName.');
	}

	options = options || {};

	// start hidden
	if (options.hidden) {
		this.hide();
	}

	// set identifier (used by getChild)
	if ('name' in options) {
		this._name = String(options.name);
	}

	if ('className' in options) {
		this.addClassNames(options.className);
	}

	if ('style' in options) {
		this.setStyles(options.style || {});
	}
};

/**
 * @deprecated
 * @param {string} tagName
 * @param {Object} [options]
 */
WuiDom.prototype.assign = function (tagName, options) {
	this._assign(tagName, options);
};

/**
 * Return the name of the WuiDom given on creation
 * @returns {string}
 */
WuiDom.prototype.getWuiName = function () {
	return this._name;
};


/**
 * @param {WuiDom|string} child
 * @returns {WuiDom} - oldChild
 */
WuiDom.prototype.removeChild = function (child) {
	var isWuiDom = child instanceof WuiDom;

	if (!isWuiDom) {
		child = this._childrenMap[child];

		if (!child) {
			throw new Error('WuiDom: Given name is not a current child');
		}
	}

	var siblingIndex = this._childrenList.indexOf(child);
	if (siblingIndex === -1) {
		throw new Error('WuiDom: Not a current child');
	}

	this.rootElement.removeChild(child.rootElement);
	this._childrenList.splice(siblingIndex, 1);
	if (this._childrenMap.hasOwnProperty(child._name)) {
		delete this._childrenMap[child._name];
	}
	child._parent = null;
	return child;
};

/**
 * @private
 */
WuiDom.prototype._unsetParent = function () {
	if (this._parent) {
		this._parent.removeChild(this);
	}
};

/**
 * @param {WuiDom} parent
 * @private
 */
WuiDom.prototype._setParent = function (parent) {
	if (parent === this._parent) {
		// Already set, nothing to do
		return;
	}

	if (this._name) {
		if (parent._childrenMap[this._name]) {
			throw new Error('WuiDom: Parent already has a child with this name');
		}
		parent._childrenMap[this._name] = this;
	}

	this._parent = parent;
};


/**
 * @returns {WuiDom|null}
 */
WuiDom.prototype.getParent = function () {
	return this._parent;
};


/**
 * @param {WuiDom} newChild
 * @returns {WuiDom}
 */
WuiDom.prototype.appendChild = function (newChild) {
	if (this._contentType && this._contentType !== cType.WUI) {
		this._clearLinearContent();
	}

	if (this === newChild._parent) {
		var siblingIndex = this._childrenList.indexOf(newChild);
		if (siblingIndex !== -1) {
			this._childrenList.splice(siblingIndex, 1);
		}
	} else {
		newChild._unsetParent();
		newChild._setParent(this);
	}

	this._childrenList.push(newChild);
	this.rootElement.appendChild(newChild.rootElement);

	// touch events are known to get lost, so rebind them
	newChild.rebindTouchListeners();
	this._contentType = cType.WUI;
	return newChild;
};

/**
 * Creates an instance of WuiDom and assigns a newly built HTML element to it,
 * following the logic of the private createHtmlElement function. It is then appended to
 * this component.
 * @param {string} tagName
 * @param {Object} [options]
 * @returns {WuiDom}
 */
WuiDom.prototype.createChild = function (tagName, options) {
	return this.appendChild(new WuiDom(tagName, options));
};


/**
 * @param {WuiDom} newParent
 */
WuiDom.prototype.appendTo = function (newParent) {
	newParent.appendChild(this);
};


/**
 * @param {WuiDom} newChild
 * @param {WuiDom} [newNextSibling]
 * @returns {WuiDom} - newChild
 */
WuiDom.prototype.insertChildBefore = function (newChild, newNextSibling) {
	if (this._contentType && this._contentType !== cType.WUI) {
		this._clearLinearContent();
	}

	var siblingIndex;

	if (this === newChild._parent) {
		var childIndex = this._childrenList.indexOf(newChild);
		if (childIndex !== -1) {
			this._childrenList.splice(childIndex, 1);
		}
	} else {
		newChild._unsetParent();
	}

	if (!newNextSibling) {
		siblingIndex = this._childrenList.length;
	} else {
		siblingIndex = this._childrenList.indexOf(newNextSibling);
		if (siblingIndex === -1) {
			throw new Error('WuiDom: Wanted sibling is not a child');
		}
	}

	newChild._setParent(this);
	this.rootElement.insertBefore(newChild.rootElement, newNextSibling && newNextSibling.rootElement);

	// touch events are known to get lost, so rebind them
	newChild.rebindTouchListeners();

	this._childrenList.splice(siblingIndex, 0, newChild);
	this._contentType = cType.WUI;
	return newChild;
};


// override this function to implement custom insertBefore behavior
/**
 * @param {WuiDom} newNextSibling
 * @returns {WuiDom} - newNextSibling
 */
WuiDom.prototype.insertBefore = function (newNextSibling) {
	if (!newNextSibling._parent) {
		throw new Error('WuiDom: sibling has no parent');
	}
	newNextSibling._parent.insertChildBefore(this, newNextSibling);

	return newNextSibling;
};

// override this function to implement custom insertAsFirstChild behavior
/**
 * @param {WuiDom} newChild
 * @returns {WuiDom} - newChild
 */
WuiDom.prototype.insertAsFirstChild = function (newChild) {
	var firstChild = this._childrenList[0];

	if (firstChild) {
		return this.insertChildBefore(newChild, firstChild);
	}

	return this.appendChild(newChild);
};

/**
 * @returns {WuiDom[]} - List of children attached to this WuiDom
 */
WuiDom.prototype.getChildren = function () {
	return this._childrenList.concat();
};

/**
 * @returns {number} - Number of children attached to this WuiDom
 */
WuiDom.prototype.getChildCount = function () {
	return this._childrenList.length;
};

/**
 * @param {string} childName
 * @returns {WuiDom|undefined}
 */
WuiDom.prototype.getChild = function (childName) {
	return this._childrenMap[childName];
};

/**
 * Clean text or html content
 * @private
 */
WuiDom.prototype._clearLinearContent = function () {
	this._text = null;
	this._currentTextContent = null;
	this.rootElement.innerHTML = '';
};

/**
 * Set the html content of the WuiDom.
 * Be aware this will wipe out WuiDom child or text content.
 * @param {string} value
 */
WuiDom.prototype.setHtml = function (value) {
	// Clean if contain children
	if (this._contentType === cType.WUI) {
		this._destroyChildren();
	}

	// Clean if contain text
	if (this._contentType === cType.TEXT) {
		this._clearLinearContent();
	}

	this.rootElement.innerHTML = value;
	this._contentType = cType.HTML;
};

/**
 * Set a textNode as a child and inject the string value
 * Be aware this will wipe out WuiDom child or html content.
 * @param {string} value
 */
WuiDom.prototype.setText = function (value) {
	// Clean if contain children
	if (this._contentType === cType.WUI) {
		this._destroyChildren();
	}

	// Clean if contain html
	if (this._contentType === cType.HTML) {
		this._clearLinearContent();
	}

	if (value === null || value === undefined) {
		return;
	}

	value = value.valueOf();

	if (!this._text) {
		this._text = document.createTextNode('');
		this.rootElement.appendChild(this._text);
	}

	if (value !== this._currentTextContent) {
		this._currentTextContent = value;
		this._text.nodeValue = value;
	}
	this._contentType = cType.TEXT;
};

/**
 * @returns {string}
 */
WuiDom.prototype.getText = function () {
	return this._currentTextContent;
};


/**
 * Style accessors
 * @param {string} property
 * @param {string|number} value
 */
WuiDom.prototype.setStyle = function (property, value) {
	this.rootElement.style[property] = value;
};

/**
 * @param {Object} map - CSS properties
 */
WuiDom.prototype.setStyles = function (map) {
	var s = this.rootElement.style;

	for (var key in map) {
		s[key] = map[key];
	}
};

/**
 * @param {string} property
 */
WuiDom.prototype.unsetStyle = function (property) {
	this.rootElement.style[property] = '';
};

/**
 * @param {string} property
 * @returns {string}
 */
WuiDom.prototype.getStyle = function (property) {
	return this.rootElement.style[property];
};

/**
 * @param {string} property - css property (javascript notation : background-image -> backgroundImage)
 * @returns {string}
 */
WuiDom.prototype.getComputedStyle = function (property) {
	var computedStyle = window.getComputedStyle(this.rootElement);
	if (!computedStyle) {
		return null;
	}

	return computedStyle.getPropertyValue(property);
};

/**
 * @param {...string} arguments - css properties (javascript notation : background-image -> backgroundImage)
 * @returns {Object} - an object indexed by the css properties and their computed style as value.
 */
WuiDom.prototype.getComputedStyles = function () {
	var computedStyle = window.getComputedStyle(this.rootElement);
	if (!computedStyle) {
		return {};
	}

	var propertyValues = {};
	for (var i = 0, len = arguments.length; i < len; i += 1) {
		var property = arguments[i];
		propertyValues[property] = computedStyle.getPropertyValue(property);
	}

	return propertyValues;
};

// className accessors

/**
 * Returns an array of all class names
 * @returns {Array}
 */
WuiDom.prototype.getClassNames = function () {
	return toArray(this.rootElement.classList);
};

/**
 * Returns true/false depending on the given className being present
 * @param {string} className
 * @returns {boolean}
 */
WuiDom.prototype.hasClassName = function (className) {
	return this.rootElement.classList.contains(className);
};

/**
 * Allows for adding multiples in separate arguments, space separated or a mix
 * @param {...string|...string[]} arguments - classNames
 */
WuiDom.prototype.setClassNames = function () {
	this.rootElement.className = '';
	var classList = this.rootElement.classList;
	classList.add.apply(classList, toArray(arguments));
};


/**
 * Allows for adding multiples in separate arguments, space separated or a mix
 * @param {...string|...string[]} arguments - classNames
 */
WuiDom.prototype.addClassNames = function () {
	var classList = this.rootElement.classList;
	classList.add.apply(classList, toArray(arguments));
};

/**
 * Adds all classNames in addList and removes the ones in delList
 * @param {string[]} delList
 * @param {string[]} addList
 */
WuiDom.prototype.replaceClassNames = function (delList, addList) {
	var classList = this.rootElement.classList;
	classList.remove.apply(classList, toArray(delList));
	classList.add.apply(classList, toArray(addList));
};

/**
 * Allows for deleting multiples in separate arguments, space separated or a mix
 * @param {...string|...string[]} arguments - classNames
 */
WuiDom.prototype.delClassNames = function () {
	var classList = this.rootElement.classList;
	classList.remove.apply(classList, toArray(arguments));
};

/**
 * Toggle the presence of a list of classNames
 * Can enforce the addition or deletion with the second argument
 * @param {string[]} classNames
 * @param {Boolean} [shouldAdd]
 * @deprecated
 */
WuiDom.prototype.toggleClassNames = function (classNames, shouldAdd) {
	for (var i = 0; i < classNames.length; i += 1) {
		this.toggleClassName(classNames[i], shouldAdd);
	}
};

/**
 * Toggle the presence of a className
 * Can enforce the addition or deletion with the second argument
 * @param {string} className
 * @param {Boolean} [shouldAdd]
 */
WuiDom.prototype.toggleClassName = function (className, shouldAdd) {
	if (shouldAdd === true || shouldAdd === false) {
		return this.rootElement.classList.toggle(className, shouldAdd);
	} else {
		return this.rootElement.classList.toggle(className);
	}
};

/**
 * Unassign the DOM object
 * @private
 */
WuiDom.prototype._removeDom = function () {
	var elm = this.rootElement;
	if (elm) {
		// release DOM from the DOM tree
		elm.remove();
		// drop DOM references
		this.rootElement = null;
	}
};

/**
 * Destroy all children of a WuiDom
 * @private
 */
WuiDom.prototype._destroyChildren = function () {
	var children = this._childrenList.concat();
	this._childrenList = [];
	this._childrenMap = {};

	for (var i = 0, len = children.length; i < len; i += 1) {
		var child = children[i];

		child.emit('destroy');

		child._parent = null;
		child._destroyChildren();
		child._removeDom();
		child.removeAllListeners();
	}
};

/**
 * Clear any actual content of the WuiDom
 * Emitting 'cleared' so extra cleanup can be done
 */
WuiDom.prototype.clearContent = function () {
	switch (this._contentType) {
	case cType.HTML:
	case cType.TEXT:
		this._clearLinearContent();
		break;
	case cType.WUI:
		this._destroyChildren();
		break;
	}

	this._contentType = cType.EMPTY;
	this.emit('cleared');
};


/**
 * Removing the domElement and
 */
WuiDom.prototype.destroy = function () {
	this.emit('destroy');

	// clean siblings
	this._unsetParent();
	this._destroyChildren();

	// cleanup DOM tree
	this._removeDom();

	// drop any remaining event listeners
	this.removeAllListeners();
};



/**
 * Default show implementation
 */
WuiDom.prototype.showMethod = function () {
	this.rootElement.style.display = '';
};

/**
 * Default hide implementation
 */
WuiDom.prototype.hideMethod = function () {
	this.rootElement.style.display = 'none';
};

/**
 * @param {*} [data]
 */
WuiDom.prototype.show = function () {
	if (this._elementIsVisible) {
		return;
	}
	this._elementIsVisible = true;
	this.showMethod();
	this.emit('show');
};

/**
 * @param {*} [data]
 */
WuiDom.prototype.hide = function () {
	if (!this._elementIsVisible) {
		return;
	}
	this._elementIsVisible = false;
	this.hideMethod();
	this.emit('hide');
};

/**
 * Toggle the visibility of the WuiDom
 * @param {boolean} [shouldShow]
 * @param {*} [data]
 * @returns {Boolean}
 */
WuiDom.prototype.toggleDisplay = function (shouldShow) {
	if (shouldShow === undefined) {
		shouldShow = !this._elementIsVisible;
	}

	if (shouldShow) {
		this.show();
	} else {
		this.hide();
	}
	return !!shouldShow;
};

/**
 * Returns the visibility status of a WuiDom.
 * The visibility status is based on the show and hide methods and
 * if the Dom has been added to the document.
 * It is also possible to get the visibility based on its parent tree.
 * @param {Boolean} [checkTree] - Go up the tree
 * @returns {Boolean}
 */
WuiDom.prototype.isVisible = function (checkTree) {
	// If the WuiDom has been hidden
	if (!this._elementIsVisible) {
		return false;
	}

	// If asked check the parent's visibility
	if (checkTree && this._parent) {
		return this._parent.isVisible(true);
	}

	return true;
};


/**
 * rebindTouchListeners
 */
WuiDom.prototype.rebindTouchListeners = function () {
	if (this.domListeners) {
		var elm = this.rootElement;

		for (var domEventName in this.domListeners) {
			if (!domEventName.match(/^touch/)) {
				continue;
			}

			var domListener = this.domListeners[domEventName];
			for (var eventName in domListener) {
				var evtFn = domListener[eventName];
				elm.removeEventListener(eventName, evtFn);
				elm.addEventListener(eventName, evtFn);
			}
		}
	}
};

/**
 * @param {Tome} tome
 * @param {Function} cb - Update function. Receive current and old value
 */
WuiDom.prototype.bindToTome = function (tome, cb) {
	var self = this;

	if (!cb) {
		cb = function (value) {
			self.setText(value);
		};
	}

	function update(was) {
		cb(this.valueOf(), was);
	}

	tome.on('readable', update);
	cb(tome.valueOf());

	this.on('destroy', function () {
		tome.removeListener('readable', update);
	});
};


/**
 * allowDomEvents
 */
WuiDom.prototype.allowDomEvents = function () {
	// Check if DOM event listeners are already set
	if (this.domListeners) {
		return;
	}

	// Initialize DOM event listeners object
	this.domListeners = {};

	// Bind relevant DOM event listeners when the corresponding wuiDom event listener is created
	this.on('newListener', domEvents.new);

	// Remove DOM listeners when the last event listener for that event gets removed
	this.on('removeListener', domEvents.remove);

	// Destroy DOM event listeners on destroy
	this.on('destroy', domEvents.destroy);
};



/*****************
 ** WEBPACK FOOTER
 ** ./~/wuidom/src/index.js
 ** module id = 189
 ** module chunks = 0
 **/