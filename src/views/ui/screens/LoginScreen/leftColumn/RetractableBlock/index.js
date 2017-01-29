require('./style.less');
var inherits = require('util').inherits;
var WuiDom  = require('wuidom');
var Button = require('Button');

var staticRetractableBlockList = [];

function RetractableBlock(expanded) {
	WuiDom.call(this, 'div', { className: 'RetractableBlock', hidden: false });
	var self = this;

	this.createChild('div', { className: ['frame', 'frame2'] }); // background frame
	var content = this.createChild('div', { className: 'content' }); // content wrapper

	// title
	this._titleBox = content.createChild('div', { className: 'titleBox' });
	this._titleBullet = this._titleBox.createChild('div', { className: 'titleBullet' });
	this._title = this._titleBox.createChild('div', { className: 'title' });
	this._expandButton = this._titleBox.appendChild(
		new Button({
			className: ['greenButton', 'expandButton']
		}, function () {
			self.expand();
		})
	);
	this._expandButton.createChild('div', { className: 'expandeButtonContent', text: '+' });
	this._subTitle = this._titleBox.createChild('div', { className: 'subTitle' });

	// wrapper for retract/expand animation
	this._retractable = content.createChild('div', { className: 'retractable' });

	if (expanded) {
		this._expand();
	}

	staticRetractableBlockList.push(this);
}

inherits(RetractableBlock, WuiDom);
module.exports = RetractableBlock;

RetractableBlock.prototype.getContainer = function () {
	return this._retractable;
};

RetractableBlock.prototype.setTitle = function (title) {
	this._title.setText(title);
};

RetractableBlock.prototype.setSubTitle = function (subTitle) {
	this._subTitle.setText(subTitle);
};

RetractableBlock.prototype.expand = function () {
	for (var i = 0; i < staticRetractableBlockList.length; i++) {
		var block = staticRetractableBlockList[i];
		if (this === block) {
			block._expand();
		} else {
			block._retract();
		}
	}
};

RetractableBlock.prototype._expand = function () {
	this._retractable.addClassNames('expanded');
	this._titleBox.addClassNames('expanded');
	this._expandButton.addClassNames('expanded');
};

RetractableBlock.prototype._retract = function () {
	this._retractable.delClassNames('expanded');
	this._titleBox.delClassNames('expanded');
	this._expandButton.delClassNames('expanded');
};


/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/screens/LoginScreen/leftColumn/RetractableBlock/index.js
 ** module id = 992
 ** module chunks = 0
 **/