require('./styles.less');
var Button = require('Button');
var getText = require('getText').getText;
var inherits = require('util').inherits;
var Window = require('Window');
var windowsManager = require('windowsManager');
var shopHelper = require('shopHelper');

var STATE = {
	PENDING: 0,
	FAILED: 1,
	SUCCEEDED: 2
};

function PurchasesPendingWindow() {
	Window.call(this, {
		title: getText('tablet.purchasesPending.title'),
		className: 'PurchasesPendingWindow',
		noCloseButton: true,
		positionInfo: {
			left: 'c', top: 'c', width: 450, height: 243,
			isModal: true
		}
	});

	this._reset();

	this.on('open', this._onOpen);

	var self = this;
	var connectionManager = window.dofus.connectionManager;
	connectionManager.on('shopIAPArticlesSuccess', function (msg) {
		if (!self._content) {
			return;
		}
		var articles = msg.articles;
		shopHelper.validateArticles(articles);
		self.displayPurchasesList(null, articles);
	});

	connectionManager.on('shopIAPArticlesError', function (/*msg*/) {
		if (!self._content) {
			return;
		}
		self.displayPurchasesList(new Error('IAP articles are not available'));
	});
}
inherits(PurchasesPendingWindow, Window);
module.exports = PurchasesPendingWindow;

PurchasesPendingWindow.prototype._reset = function () {
	this.windowBody.clearContent();

	this._content = null;
	this._description = null;
	this._spinner = null;

	this._pendingPurchases = [];
	this._purchasesDetails = {};
	this._isProcessing = false;
};

PurchasesPendingWindow.prototype._onOpen = function () {
	if (!this._content) { this._createContent(); }
};

PurchasesPendingWindow.prototype.freeContent = function () {
	this._reset();
};

PurchasesPendingWindow.prototype._createContent = function () {
	this._content = this.windowBody.createChild('div', { className: 'content' });

	var textBox = this._content.createChild('div', { className: 'textBox' });
	this._description = textBox.createChild('div', { className: 'description' });
	this._purchasesList = textBox.createChild('div', { className: 'purchasesList' });
	this._spinner = textBox.createChild('div', { className: ['spinnerContainer', 'spinner'] });
	this._validationDone = textBox.createChild('div', { className: 'validationDone', hidden: true });
	this._okButton = this._content.appendChild(new Button({
		text: getText('ui.common.ok'),
		className: ['greenButton', 'okButton']
	}, function () {
		windowsManager.close('purchasesPending');
	}));
	this._okButton.disable();
};

PurchasesPendingWindow.prototype._processNext = function () {
	var nextPurchase = this._pendingPurchases[0];
	var nextPurchaseDetails = this._purchasesDetails[nextPurchase.productId];
	if (!nextPurchaseDetails || !nextPurchaseDetails.article) {
		return;
	}
	this._pendingPurchases.shift();
	shopHelper.validatePendingIAP(nextPurchase, nextPurchaseDetails.article);
};

PurchasesPendingWindow.prototype.displayPurchasesList = function (error, articles) {
	if (error) {
		console.error(error);
	}

	if (!this._content) {
		return;
	}

	if (error) {
		this._spinner.hide();
		this._purchasesList.setText(getText('tablet.purchasesPending.listNotAvailable'));
	} else {
		for (var i = 0; i < articles.length; i++) {
			var article = articles[i];
			var purchaseDetails = this._purchasesDetails[article.key];
			if (!purchaseDetails) {
				continue;
			}
			var entry = this._purchasesList.getChild(article.key);
			if (!entry) {
				entry = this._purchasesList.createChild('div', { className: 'entry', name: article.key, text: article.name });
				entry.createChild('div', { className: 'state' });
				entry.createChild('div', { className: 'name', text: article.name });
			}
			purchaseDetails.article = article;
			var state = purchaseDetails.state;
			switch (state) {
				case STATE.PENDING:
					entry.delClassNames(['failure', 'success']);
					break;
				case STATE.FAILED:
					entry.replaceClassNames(['success'], ['failure']);
					break;
				case STATE.SUCCEEDED:
					entry.replaceClassNames(['failure'], ['success']);
					break;
			}
		}

		this._startProcessing();

		if (Object.keys(this._purchasesDetails).length <= this._purchasesList.getChildCount()) {
			this._spinner.hide();
		}
	}
};

/**
 * Opens the pending purchases window to validate these purchases.
 * @param {Array} purchases - Purchase object returned by wizPurchase
 */
PurchasesPendingWindow.prototype.validatePendingPurchases = function (purchases) {
	if (!purchases || !purchases.length) {
		return console.error(new Error('No purchase to validate: ' + purchases));
	}

	var missingPurchases = purchases.filter(function (purchase) {
		return !this._purchasesDetails[purchase.productId];
	}, this);
	missingPurchases.forEach(function (purchase) {
		this._purchasesDetails[purchase.productId] = { state: STATE.PENDING, article: null };
	}, this);
	this._pendingPurchases = this._pendingPurchases.concat(missingPurchases);

	if (!missingPurchases.length) {
		return;
	}

	windowsManager.open(this.id);

	this._description.setText(getText('tablet.purchasesPending.description', Object.keys(this._purchasesDetails).length) +
		getText('ui.common.colon'));
	this._spinner.show();
	var self = this;
	shopHelper.getStoreInfos(function (error) {
		if (error) {
			return self.displayPurchasesList(error);
		}
		window.dofus.send('shopIAPArticlesRequest');
	});
};

PurchasesPendingWindow.prototype._startProcessing = function () {
	if (this._isProcessing) {
		return;
	}
	this._isProcessing = true;
	this._validationDone.hide();
	this._okButton.disable();
	this._processNext();
};

PurchasesPendingWindow.prototype._endProcessing = function () {
	var nbSuccessfulPurchases = 0;
	var hasFailed = false;
	for (var productId in this._purchasesDetails) {
		var state = this._purchasesDetails[productId].state;
		if (state === STATE.SUCCEEDED) {
			nbSuccessfulPurchases++;
		} else if (!hasFailed && state === STATE.FAILED) {
			hasFailed = true;
		}
	}

	if (hasFailed) {
		window.wizPurchase.refreshReceipt(function () {
			// Refresh receipt succeeded
		}, function (error) {
			console.error('Refresh receipt failed', error);
		});
	}

	this._isProcessing = false;
	this._validationDone.setText(getText('tablet.purchasesPending.validationDone', nbSuccessfulPurchases));
	this._validationDone.show();
	this._okButton.enable();
};

PurchasesPendingWindow.prototype.validateNextPendingPurchases = function (error, productId) {
	if (error) {
		console.error(error);
	}

	if (!this._content) {
		return;
	}

	var entry = this._purchasesList.getChild(productId);
	this._purchasesDetails[productId].state = error ? STATE.FAILED : STATE.SUCCEEDED;
	if (entry) {
		if (error) {
			entry.replaceClassNames(['success'], ['failure']);
		} else {
			entry.replaceClassNames(['failure'], ['success']);
		}
	}

	if (!this._pendingPurchases.length) {
		this._endProcessing();
	} else {
		this._processNext();
	}
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/PurchasesPendingWindow/index.js
 ** module id = 975
 ** module chunks = 0
 **/