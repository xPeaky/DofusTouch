/**
 * AVL TREE Class
 *
 * @author Brice Chevalier
 *
 * @param {function} comparisonFunction comparison function that takes two parameters a and b and returns a number
 *
 * @desc Avl Tree data structure, keep elements sorted, removal and insertion in O(log2(n))
 *
 *    Method                Time Complexity
 *    ___________________________________
 *
 *    add                    O(log2(n))
 *    remove                 O(log2(n))
 *    getRoot                O(1)
 *    getCount               O(1)
 *    forEach                O(n * P) where P is the complexity of the processing function
 *    forEachReverse         O(n * P) where P is the complexity of the processing function
 *    clear                  O(n)
 *
 *    Memory Complexity in O(n)
 */
function AvlTree(comparisonFunction) {
	this.count = 0;
	this.root = null;
	this.cmpFunc = comparisonFunction;
}

function Node(obj, container) {
	this.object = obj;
	this.height = 1;
	this.left   = null;
	this.right  = null;
	this.parent = null;
	this.container = container;
}

AvlTree.prototype._addLeft = function (node, parent) {
	node.parent = parent;
	parent.left = node;
};

AvlTree.prototype._addRight = function (node, parent) {
	node.parent = parent;
	parent.right = node;
};

AvlTree.prototype.add = function (obj) {
	this.count += 1;
	var newNode = new Node(obj, this);
	if (this.root === null) {
		this.root = newNode;
		return newNode;
	}

	var current = this.root;
	for (;;) {
		var cmp = this.cmpFunc(obj, current.object);
		if (cmp < 0) {
			// Adding to the left
			if (current.left === null) {
				this._addLeft(newNode, current);
				break;
			} else {
				current = current.left;
			}
		} else if (cmp > 0) {
			// Adding to the right
			if (current.right === null) {
				this._addRight(newNode, current);
				break;
			} else {
				current = current.right;
			}
		} else {
			if (current.left === null) {
				this._addLeft(newNode, current);
				break;
			} else if (current.right === null) {
				this._addRight(newNode, current);
				break;
			} else {
				if (current.right.height < current.left.height) {
					current = current.right;
				} else {
					current = current.left;
				}
			}
		}
	}

	this._balance(newNode.parent);

	return newNode;
};

AvlTree.prototype._balanceLeftRight = function (node) {
	var left = node.left;
	var a = left.left;
	var b = left.right.left;

	left.right.left = left;
	node.left = left.right;
	left = node.left;
	left.parent = node;

	var leftLeft = left.left;
	leftLeft.parent = left;
	leftLeft.left = a;
	leftLeft.right = b;
	if (a !== null) {
		a.parent = leftLeft;
	}
	if (b !== null) {
		b.parent = leftLeft;
	}

	left.height = leftLeft.height + 1;
};

AvlTree.prototype._balanceLeftLeft = function (node) {
	var left = node.left;
	var c = left.right;

	if (node === this.root) {
		this.root = left;
	} else {
		if (node.parent.right === node) {
			node.parent.right = left;
		} else {
			node.parent.left = left;
		}
	}

	left.right = node;
	left.parent = node.parent;
	node.parent = left;
	node.left = c;
	if (c !== null) {
		c.parent = node;
	}

	node.height = node.height - 1;
};

AvlTree.prototype._balanceRightLeft = function (node) {
	var right = node.right;
	var a = right.right;
	var b = right.left.right;

	right.left.right = right;
	node.right = right.left;
	right = node.right;
	right.parent = node;

	var rightRight = right.right;
	rightRight.parent = right;
	rightRight.right = a;
	rightRight.left = b;
	if (a !== null) {
		a.parent = rightRight;
	}
	if (b !== null) {
		b.parent = rightRight;
	}

	node.right.height = rightRight.height + 1;
};


AvlTree.prototype._balanceRightRight = function (node) {
	var right = node.right;
	var c = right.left;

	if (node === this.root) {
		this.root = right;
	} else {
		if (node.parent.left === node) {
			node.parent.left = right;
		} else {
			node.parent.right = right;
		}
	}

	right.left = node;
	right.parent = node.parent;
	node.parent = right;
	node.right = c;
	if (c !== null) {
		c.parent = node;
	}

	node.height = node.height - 1;
};

AvlTree.prototype._balance = function (node) {
	// Balancing the tree
	var current = node;
	while (current !== null) {
		var leftHeight = (current.left === null) ? 0 : current.left.height;
		var rightHeight = (current.right === null) ? 0 : current.right.height;
		var newHeight = 1 + Math.max(leftHeight, rightHeight);

		if (newHeight > current.height) {
			current.height = newHeight;
			if (leftHeight - rightHeight > 1) {
				// Left case
				if (current.left.right !== null &&
					(current.left.left === null || current.left.left.height < current.left.right.height)) {
					// Left Right Case
					this._balanceLeftRight(current);
				}

				// Left Left Case
				this._balanceLeftLeft(current);

				// The tree has been balanced
				break;
			} else if (rightHeight - leftHeight > 1) {
				// Right case
				if (current.right.left !== null &&
					(current.right.right === null || current.right.right.height < current.right.left.height)) {
					// Right Left Case
					this._balanceRightLeft(current);
				}

				// Right Right Case
				this._balanceRightRight(current);

				// The tree has been balanced
				break;
			} else {
				// Node is balanced
				current = current.parent;
			}
		} else {
			break;
		}
	}
};

AvlTree.prototype.removeByRef = function (node) {
	this.count -= 1;

	// Replacing the node by the smallest element greater than it
	var parent = node.parent;
	var left = node.left;
	var right = node.right;

	if (node.right === null) {
		if (parent === null) {
			this.root = left;
		} else {
			if (parent.right === node) {
				parent.right = left;
			} else {
				parent.left = left;
			}
		}

		if (left !== null) {
			left.parent = parent;
		}

		this._balance(parent);
		return true;
	}

	var replacement = node.right;
	var balanceFrom;

	if (replacement.left === null) {
		balanceFrom = replacement;

		if (left !== null) {
			left.parent = replacement;
		}
		replacement.left = left;

		if (parent === null) {
			this.root = replacement;
		} else {
			if (parent.right === node) {
				parent.right = replacement;
			} else {
				parent.left = replacement;
			}
		}
		replacement.parent = parent;

		this._balance(balanceFrom);

		return true;
	}

	replacement = replacement.left;
	while (replacement.left !== null) {
		replacement = replacement.left;
	}

	if (replacement.right !== null) {
		replacement.right.parent = replacement.parent;
	}
	replacement.parent.left = replacement.right;

	if (right !== null) {
		right.parent = replacement;
	}
	replacement.right = right;

	balanceFrom = replacement.parent;

	if (left !== null) {
		left.parent = replacement;
	}
	replacement.left = left;

	if (parent === null) {
		this.root = replacement;
	} else {
		if (parent.right === node) {
			parent.right = replacement;
		} else {
			parent.left = replacement;
		}
	}
	replacement.parent = parent;

	this._balance(balanceFrom);

	return true;
};

AvlTree.prototype.getSmallestAbove = function (obj) {
	if (this.root === null) {
		return null;
	}

	var smallestAbove = null;
	var current = this.root;
	while (current !== null) {
		var cmp = this.cmpFunc(obj, current.object);
		if (cmp < 0) {
			smallestAbove = current.object;
			// Searching left
			current = current.left;
		} else if (cmp > 0) {
			// Searching right
			current = current.right;
		} else {
			return current.object;
		}
	}

	return smallestAbove;
};

AvlTree.prototype.getHeight = function () {
	return this.root.height;
};

AvlTree.prototype.getRoot = function () {
	return this.root.object;
};

AvlTree.prototype.getCount = function () {
	return this.count;
};

AvlTree.prototype._forEach = function (node, processingFunc, params) {
	if (node !== null) {
		processingFunc(node.object, params);
		this._forEach(node.left, processingFunc, params);
		this._forEach(node.right, processingFunc, params);
	}
};

AvlTree.prototype.forEach = function (processingFunc, params) {
	this._forEach(this.root, processingFunc, params);
};

AvlTree.prototype.clear = function () {
	this.count = 0;
	this.root = null;
};

module.exports = AvlTree;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/AvlTree/index.js
 ** module id = 270
 ** module chunks = 0
 **/