var DEFAULT_ENVELOPE = 0.08;
var MINIMUM_MOVEMENT = 0.001;
var MAX_ITERATIONS = 1000;
var EPSILON = 0.0001;
var PI2 = Math.PI * 2;

function Node(value, left) {
	this.value = value;
	this.originalValue = value;
	this.forceLeft  = 0;
	this.forceRight = 0;
	this.left  = left;
	this.right = null;

	if (left) { left.right = this; }
}

Node.prototype.updateValue = function () {
	var movement = this.forceLeft - this.forceRight;
	this.value += movement;
	return Math.abs(movement);
};

Node.prototype.distance = function (node) {
	if (!node) { return Infinity; }
	var distance = Math.abs(node.value - this.value);
	return Math.min(distance, PI2 - distance);
};

Node.prototype.updateForces = function (envelope) {
	var distanceLeft  = this.distance(this.left);
	var distanceRight = this.distance(this.right);

	this.forceLeft  = (distanceLeft  < envelope + EPSILON) ? (envelope - distanceLeft)  / 2 : 0;
	this.forceRight = (distanceRight < envelope + EPSILON) ? (envelope - distanceRight) / 2 : 0;
};


function sortMarkers(a, b) {
	return a.angle - b.angle;
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
function distributeMarkers(markers, envelope) {
	// need at least 2 markers
	if (markers.length < 2) { return; }

	envelope = envelope || DEFAULT_ENVELOPE;

	// markers have to be sorted so we add nodes in correct order
	markers.sort(sortMarkers);

	var nodes = [];
	var i;

	// cluster detection variables
	var first = null;
	var isCluster = true;

	// adding all nodes
	var node  = null;

	for (i = 0; i < markers.length; i++) {
		node = new Node(markers[i].angle, node);
		nodes.push(node);
		first = first || node;
		isCluster = isCluster && node.distance(first) < envelope;
	}

	// if there is only one cluster, the ring should remain open
	if (isCluster) {
		// check that cluster is split at the correct position
		if (markers[markers.length - 1].angle - markers[0].angle > envelope) {
			for (i = 1; i < markers.length; i++) {
				if (markers[i].angle - markers[0].angle > envelope) {
					nodes[i - 1].right = null;
					nodes[i].left = null;
					break;
				}
			}
			nodes[0].left = node;
			node.right = nodes[0];
		}
	} else {
		// connect ring boundaries
		nodes[0].left = node;
		node.right = nodes[0];
	}

	// solve collisions
	var totalMovement = Infinity;
	var minimumMovement = MINIMUM_MOVEMENT * markers.length;
	var iterations = 0;

	// stop when state became stable
	while (totalMovement > minimumMovement) {
		if (++iterations >= MAX_ITERATIONS) { break; }
		totalMovement = 0;

		for (i = 0; i < nodes.length; i++) {
			nodes[i].updateForces(envelope);
		}

		for (i = 0; i < nodes.length; i++) {
			totalMovement += nodes[i].updateValue();
		}
	}

	// put back corrected values of angles in marker array
	for (i = 0; i < markers.length; i++) {
		markers[i].angleCorrected = nodes[i].value;
	}
}

module.exports = distributeMarkers;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/mainUi/Compass/distributeMarkers.js
 ** module id = 591
 ** module chunks = 0
 **/