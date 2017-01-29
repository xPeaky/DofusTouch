var clusterOrdering = require('./worldMapHelpers.js').clusterOrdering;
var IconCluster     = require('./IconCluster');
var Icon            = require('./Icon.js');

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Icon batch data. Hold the data for the icons of a WorldMap element and displayed by an IconBatch element.
 *
 * @param {WorldMap} worldMap
 */
function IconBatchData(worldMap) {
	this.texture        = null;
	this.iconDimensions = null;
	this.iconBatch      = null;

	this.worldMap = worldMap;

	this.reset();
}
module.exports = IconBatchData;

IconBatchData.prototype.getClusterIcons = function (clusterId) {
	var iconCluster = this.iconClusters[clusterId];
	if (iconCluster) {
		return iconCluster.icons;
	}
	return;
};

IconBatchData.prototype.reset = function () {
	this.icons            = {}; // Icons present on the world map
	this.iconClusters     = {}; // Cluster of icons, clustered per zoneId, but there can be exceptions (user position)
	this.iconsPerCategory = {}; // Icons per category (flag, userPosition, etc...)

	this.zIndexedIconClusters = [];
};

IconBatchData.prototype.addCluster = function (cluster) {
	this.iconClusters[cluster.id] = cluster;
	this.zIndexedIconClusters.push(cluster);

	// Maintaining the list of sorted clusters
	// Should be fast on mostly sorted arrays.
	this.zIndexedIconClusters.sort(clusterOrdering);
};

IconBatchData.prototype.removeCluster = function (cluster) {
	var idx = this.zIndexedIconClusters.indexOf(cluster);
	if (idx === -1) {
		console.error(new Error('[IconBatchData.removeCluster] Trying to remove inexistent cluster'));
		return;
	}

	delete this.iconClusters[cluster.id];
	this.zIndexedIconClusters.splice(idx, 1);
};

IconBatchData.prototype.createIconModels = function (iconsData, iconsTexture) {
	// Mapping icons atlas data with their class names
	var iconDimensions = {};
	var iconIds = Object.keys(iconsData);
	for (var i = 0; i < iconIds.length; i += 1) {
		var iconData = iconsData[iconIds[i]];
		iconDimensions[iconData.className] = iconData;
	}

	this.texture = iconsTexture;
	this.iconDimensions = iconDimensions;
};

IconBatchData.prototype.clearIconBatch = function () {
	if (this.iconBatch !== null) {
		this.iconBatch.clear();
		this.iconBatch = null;
	}
};

IconBatchData.prototype.addIcon = function (icon) {
	var iconId = icon.id;
	if (this.icons[iconId] === undefined) {
		this.icons[iconId] = icon;
	} else {
		console.error('An icon of id', iconId, 'already exists.');
		return;
	}

	var categoryId = icon.categoryId;
	if (this.iconsPerCategory[categoryId] === undefined) {
		this.iconsPerCategory[categoryId] = [icon];
	} else {
		this.iconsPerCategory[categoryId].push(icon);
	}

	// If a batch has been attached to this data
	// Then require display of the newly added icon
	if (this.iconBatch !== null) {
		this.iconBatch.addIcon(icon);
	}
};

IconBatchData.prototype.removeIcon = function (iconId) {
	var icon = this.icons[iconId];
	if (icon === undefined) { return; }

	// Removing from icons per id
	delete this.icons[iconId];

	// Removing from icon cluster
	var cluster = icon.cluster;
	cluster.remove(icon);

	if (cluster.icons.length === 0) {
		this.removeCluster(cluster);
	}

	// Removing from icons per category
	var iconsInCategory = this.iconsPerCategory[icon.categoryId];
	var indexInCategory = iconsInCategory.indexOf(icon.id);
	iconsInCategory.splice(indexInCategory, 1);

	// If a batch has been attached to this data
	// Then require removal of the newly removed icon
	if (this.iconBatch !== null) {
		this.iconBatch.removeIcon(icon);
	}
};

IconBatchData.prototype._addIconToZoneCluster = function (icon, i, j) {
	var zoneId = this.worldMap.convertGridCoordinateToZoneId(i, j);
	var iconCluster = this.iconClusters[zoneId];
	if (iconCluster === undefined) {
		// Computing icon cluster position in the scene
		var zonePosition = this.worldMap._convertGridToSceneCoordinate(i, j);
		iconCluster = new IconCluster(zoneId, zonePosition.x, zonePosition.y);
		this.addCluster(iconCluster);
	}

	iconCluster.add(icon);
	icon.cluster = iconCluster;
};

IconBatchData.prototype.createIcon = function (iconInfo, gfxId) {
	// Position of the icon in the roleplay grid
	var i = iconInfo.x;
	var j = iconInfo.y;

	var categoryId = iconInfo.categoryId;
	var icon = new Icon(iconInfo.id, categoryId, iconInfo, this.iconDimensions[gfxId]);

	this._addIconToZoneCluster(icon, i, j);
	this.addIcon(icon);

	return icon;
};

IconBatchData.prototype.createIconsFromInfo = function (iconsInfo, worldMapId) {
	var iconIds = Object.keys(iconsInfo);
	for (var i = 0; i < iconIds.length; i += 1) {
		var iconInfo = iconsInfo[iconIds[i]];
		if (iconInfo.worldMapId === worldMapId) {
			this.createIcon(iconInfo, 'icon_' + iconInfo.gfx);
		}
	}
};

IconBatchData.prototype.hasIcon = function (iconId) {
	return this.icons.hasOwnProperty(iconId);
};

IconBatchData.prototype.getIcon = function (iconId) {
	return this.icons[iconId];
};

IconBatchData.prototype.setVisibilityOfIconType = function (type, visible) {
	var iconsOfType = this.iconsPerCategory[type];
	if (iconsOfType === undefined) {
		return;
	}

	// Making a list of the icons whose visibility changed
	var iconsOfChangedVisibility = [];
	for (var i = 0; i < iconsOfType.length; i += 1) {
		var icon = iconsOfType[i];
		var changedVisibility = icon.setVisibility(visible);
		if (changedVisibility) {
			iconsOfChangedVisibility.push(icon);
		}
	}

	if (this.iconBatch !== null) {
		// Updating displayed visibility
		this.iconBatch.setVisibility(iconsOfChangedVisibility, visible);
	}
};

IconBatchData.prototype.setIconPosition = function (iconId, i, j) {
	// Removing the icon and replacing it with a copy
	var icon = this.icons[iconId];
	if (icon === undefined) { return; }

	var iconCluster = icon.cluster;
	if (iconId === 'userPosition') {
		// Special case for the user position, it has its own cluster

		// Updating the position of the cluster
		var userPosCoordinates = this.worldMap._convertGridToSceneCoordinate(i, j);
		iconCluster.position.x = userPosCoordinates.x;
		iconCluster.position.y = userPosCoordinates.y;
		this.zIndexedIconClusters.sort(clusterOrdering);
	} else {
		// General case

		// Removing icon from its cluster
		iconCluster.remove(icon);

		// Then adding it to cluster corresponding to the given gridPosition
		this._addIconToZoneCluster(icon, i, j);
	}

	if (this.iconBatch === null) {
		return;
	}

	this.iconBatch.updateIconPosition(icon);
};




/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/WorldMapWindow/WorldMap/IconBatchData.js
 ** module id = 847
 ** module chunks = 0
 **/