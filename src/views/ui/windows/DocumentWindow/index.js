require('./styles.less');
var inherits = require('util').inherits;
var Window = require('Window');
var staticContent = require('staticContent');
var windowsManager = require('windowsManager');
var playUiSound = require('audioManager').playUiSound;

var scrollDoc = require('./scroll.js');

// 2 types of documents: books and scrolls
var TYPE_BOOK = 1;
var TYPE_SCROLL = 2;


/** @class */
function DocumentWindow() {
	Window.call(this, {
		className: 'documentWindow',
		noTitle: true,
		noCloseButton: true,
		positionInfo: { left: 'c', top: 'c', width: '90%', height: '90%' }
	});

	var self = this;

	var readingBook;

	function close() {
		windowsManager.close(self.id);
		playUiSound('CLOSE_DOCUMENT');
	}

	function open(msg) {
		windowsManager.openDialog(self.id);

		// use staticContent to go get the static content (the book text)
		staticContent.getData('Documents', msg.documentId, function (error, documentContent) {
			if (error) {
				windowsManager.close(self.id);
				return console.warn('Documents error', error);
			}

			// Book
			if (documentContent.typeId === TYPE_BOOK) {
				readingBook.open(documentContent);
			}

			// Scroll
			if (documentContent.typeId === TYPE_SCROLL) {
				scrollDoc.open(documentContent);
			}

			playUiSound('OPEN_DOCUMENT');
		});
	}

	window.gui.once('DocumentReadingBeginMessage', function (msg) {
		// on first open otherwise dictionary data not yet initialized in time
		readingBook = require('./readingBook.js');
		self.windowBody.appendChild(scrollDoc);
		self.windowBody.appendChild(readingBook);

		scrollDoc.on('close', close);
		readingBook.on('close', close);

		window.gui.on('DocumentReadingBeginMessage', open);

		open(msg);
	});
}

inherits(DocumentWindow, Window);
module.exports = DocumentWindow;



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/ui/windows/DocumentWindow/index.js
 ** module id = 709
 ** module chunks = 0
 **/