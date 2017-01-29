var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var staticContent = require('staticContent');
var assetPreloading = require('assetPreloading');

var WINGS_TOP = 45; // in wings.json, info for bottom part of wings are in position 45
var WINGS_BOTTOM = 63; // in wings.json, info for bottom part of wings are in position 63

function Alignment() {
	this.alignmentInfos = null;
	this.playerRank = null;
	this.alignmentRank = null;
	this.alignmentTitles = null;
	this.alignmentRanks = null;
	this._imagePaths = [
		'gfx/alignments/Alignement_tx_IllusNeutre.png',
		'gfx/alignments/Alignement_tx_IllusBontarien.png',
		'gfx/alignments/Alignement_tx_IllusBrakmarien.png',
		'gfx/alignments/Alignement_tx_IllusMercenaire.png'
	];

	this._orderImagePaths = [
		'gfx/alignments/order_0.png',
		'gfx/alignments/order_1.png',
		'gfx/alignments/order_2.png',
		'gfx/alignments/order_3.png',
		'gfx/alignments/order_4.png',
		'gfx/alignments/order_5.png',
		'gfx/alignments/order_6.png',
		'gfx/alignments/order_7.png',
		'gfx/alignments/order_8.png',
		'gfx/alignments/order_9.png'
	];

	this._sideImagePaths = {
		1: 'gfx/alignments/wings/tx_alignment1_frame0.png',
		2: 'gfx/alignments/wings/tx_alignment2_frame0.png'
	};
}
inherits(Alignment, EventEmitter);
module.exports = Alignment;

Alignment.prototype.initialize = function (gui) {
	var self = this;
	gui.on('AlignmentRankUpdateMessage', function (msg) {
		self.playerRank = msg.alignmentRank;
		self.emit('alignmentChanged');
	});

	gui.on('initialized', function () {
		var tableNames = ['AlignmentTitles', 'AlignmentRank'];
		staticContent.getAllDataTable(tableNames, function (error, tables) {
			if (error) {
				return console.error('Unable to load data for alignment window', error);
			}
			self.alignmentTitles = tables.AlignmentTitles;
			self.alignmentRanks = tables.AlignmentRank;
		});

		gui.playerData.on('alignmentInfosUpdated', function () {
			var alignmentSides = window.gui.databases.AlignmentSides;
			self.alignmentInfos = this.characters.mainCharacter.characteristics.alignmentInfos; // 'this' is PlayerData
			self.alignmentSide = alignmentSides[self.alignmentInfos.alignmentSide];
			self.emit('alignmentChanged');
		});
	});

	var wingsJsonPath = 'gfx/alignments/wings.json';
	assetPreloading.loadJson(wingsJsonPath, function (wingsData) {
		self._wingsData = wingsData;
	});
};

Alignment.prototype.getRank = function (cb) {
	staticContent.getData('AlignmentRank', this.playerRank, cb);
};

Alignment.prototype.getOrder = function (alignmentRank, cb) {
	staticContent.getData('AlignmentOrder', alignmentRank.orderId, cb);
};

Alignment.prototype.getAlignmentImageUrl = function (cb) {
	if (!this.alignmentInfos) {
		assetPreloading.preloadImage(this._imagePaths[0], cb);
	} else {
		assetPreloading.preloadImage(this._imagePaths[this.alignmentInfos.alignmentSide], cb);
	}
};

/** returns informations for top part of wings */
Alignment.prototype.getTopWings = function (alignmentInfos, cb) {
	var self = this;
	var side = alignmentInfos.alignmentSide;
	var grade = alignmentInfos.alignmentGrade;
	// alignment formula (from Flash source) :
	// tx_wing.gotoAndStop = (alignmentInfos.alignmentSide-1)*10+1+alignmentInfos.alignmentGrade;
	var frameNumber = (side - 1) * 10 + grade;
	var imagePath = 'gfx/alignments/wings/demonAngel_frame' + frameNumber + '.png';

	assetPreloading.preloadImage(imagePath, function (imageUrl) {
		var positionWings = self._wingsData[WINGS_TOP].frames[frameNumber].position;
		var wingsInfos = {
			backgroundImage: imageUrl,
			left: positionWings.x + 'px',
			top: positionWings.y + 'px',
			width: positionWings.w + 'px',
			height: positionWings.h + 'px'
		};
		cb(wingsInfos);
	});
};

/** returns informations for bottom part of wings, retuns null if bottom part doesn't exist */
Alignment.prototype.getBottomWings = function (alignmentInfos, cb) {
	var self = this;
	var side = alignmentInfos.alignmentSide;
	var grade = alignmentInfos.alignmentGrade;
	// alignment formula (from Flash source) :
	// tx_wing.gotoAndStop = (alignmentInfos.alignmentSide-1)*10+1+alignmentInfos.alignmentGrade;
	var frameNumber = (side - 1) * 10 + grade;

	if (self._wingsData[WINGS_BOTTOM].frames[frameNumber]) {
		var imagePath = 'gfx/alignments/wings/demonAngel2_frame' + frameNumber + '.png';
		assetPreloading.preloadImage(imagePath, function (imageUrl) {
			var positionWings = self._wingsData[WINGS_BOTTOM].frames[frameNumber].position;
			var wingsInfos = {
				backgroundImage: imageUrl,
				left: positionWings.x + 'px',
				top: positionWings.y + 'px',
				width: positionWings.w + 'px',
				height: positionWings.h + 'px'
			};
			cb(wingsInfos);
		});
	} else {
		cb(null); // no bottom image for this wing
	}
};

Alignment.prototype.getSmallWingsUrl = function (side, cb) {
	var sideUrl = this._sideImagePaths[side];
	assetPreloading.preloadImage(sideUrl, cb);
};

Alignment.prototype.getOrderImageUrl = function (index, cb) {
	var orderUrl = this._orderImagePaths[index];
	assetPreloading.preloadImage(orderUrl, cb);
};

Alignment.prototype.getAlignmentGradeString = function () {
	var alignmentInfos = this.alignmentInfos;
	var grade = alignmentInfos.alignmentGrade;
	var alignmentSide = alignmentInfos.alignmentSide;
	var alignmentTitles = this.alignmentTitles;
	return (grade + ' (' +	alignmentTitles[alignmentSide].namesId[grade] + ')');
};

Alignment.prototype.getHonor = function () {
	var infos = this.alignmentInfos;
	var honorPercent = (infos.honor - infos.honorGradeFloor) / (infos.honorNextGradeFloor - infos.honorGradeFloor);
	return honorPercent;
};

Alignment.prototype.getNameId = function () {
	return this.alignmentInfos.alignmentSide.nameId;
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/components/PlayerData/Alignment.js
 ** module id = 545
 ** module chunks = 0
 **/