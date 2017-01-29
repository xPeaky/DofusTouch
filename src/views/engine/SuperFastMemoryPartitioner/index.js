var AvlTree = require('AvlTree');
var OrderedList = require('OrderedList');

function MemoryChunk(start, nBytes) {
	this.start  = start;
	this.nBytes = nBytes;
	this.update = 0;

	this.prevChunk = null;
	this.nextChunk = null;

	this.id  = null;
	this.obj = null;
	this.ref = null;
	this.nLocks = 0;
}

MemoryChunk.prototype.set = function (start, nBytes, update) {
	this.start  = start;
	this.nBytes = nBytes;
	this.update = update;
};

function SuperFastMemoryPartitioner(startingByte, endingByte) {
	this.memoryChunksFree = new AvlTree(function (a, b) {
		return a.nBytes - b.nBytes;
	});

	this.memoryChunksUsed = new OrderedList(function (a, b) {
		return a.update - b.update;
	});

	this.memoryChunksLocked = new OrderedList(function (/*a, b*/) {
		return 1;
	});

	var nBytes = endingByte - startingByte;
	var freeMemoryChunk = new MemoryChunk(startingByte, nBytes);
	freeMemoryChunk.ref = this.memoryChunksFree.add(freeMemoryChunk);

	this.firstByte = startingByte;
	this.nBytes = nBytes;
	this.update = 0;
	this.chunksById = {};
}
module.exports = SuperFastMemoryPartitioner;

SuperFastMemoryPartitioner.prototype.touch = function (chunkId) {
	var chunk = this.chunksById[chunkId];
	if (chunk !== undefined) {
		if (chunk.nLocks === 0) {
			// Incrementing update;
			chunk.update = (this.update++);

			// Putting chunk at the end of the list, in O(1)
			this.memoryChunksUsed.moveToTheEnd(chunk.ref);
		}

		return chunk.obj;
	}

	// Not able to touch
	// i.e not in memory
	return;
};

SuperFastMemoryPartitioner.prototype.getChunk = function (chunkId) {
	return this.chunksById[chunkId];
};

SuperFastMemoryPartitioner.prototype.addLock = function (chunkId) {
	var chunk = this.chunksById[chunkId];
	if (chunk !== undefined) {
		if (chunk.nLocks === 0) {
			// Removing from used chunks in O(1)
			if (!this.memoryChunksUsed.removeByRef(chunk.ref)) {
				console.warn('[SuperFastMemoryPartitioner.lock] Trying to lock an already locked chunk', chunkId);
			}

			// Adding to locked chunks in O(1)
			chunk.ref = this.memoryChunksLocked.add(chunk);
			chunk.update = Infinity;
		}

		chunk.nLocks += 1;
		return chunk.obj;
	}

	return;
};

SuperFastMemoryPartitioner.prototype.removeLock = function (chunkId) {
	var chunk = this.chunksById[chunkId];
	if (chunk !== undefined) {
		chunk.nLocks -= 1;

		if (chunk.nLocks === 0) {
			// Removing from locked chunks in O(1)
			this.memoryChunksLocked.removeByRef(chunk.ref);

			// Adding to used chunks amortized in O(1) due to value of chunk.update
			chunk.ref = this.memoryChunksUsed.add(chunk);

			// Setting update;
			chunk.update = (this.update++);
		}

		if (chunk.nLocks < 0) {
			console.warn('[SuperFastMemoryPartitioner.unlock] Trying to unlock a non-locked chunk', chunkId);
		}
	}
};

SuperFastMemoryPartitioner.prototype.possess = function (chunkId) {
	return !!this.chunksById[chunkId];
};

SuperFastMemoryPartitioner.prototype.release = function (chunkId) {
	var chunk = this.chunksById[chunkId];
	if (chunk !== undefined) {
		if (chunk.ref.container === this.memoryChunksLocked) {
			// Removing from locked chunks in O(1)
			this.memoryChunksLocked.removeByRef(chunk.ref);
		} else {
			// Removing from used chunks in O(1)
			this.memoryChunksUsed.removeByRef(chunk.ref);
		}

		if (chunk.prevChunk && (chunk.prevChunk.ref.container === this.memoryChunksFree)) {
			// Chunk in memory that comes before the newly created free chunk is free
			// Combining free chunks in O(1)
			var prevFreeChunk = chunk.prevChunk;
			chunk.start = prevFreeChunk.start;
			chunk.nBytes += prevFreeChunk.nBytes;
			chunk.prevChunk = prevFreeChunk.prevChunk;
			if (prevFreeChunk.prevChunk) {
				prevFreeChunk.prevChunk.nextChunk = chunk;
			}
			this.memoryChunksFree.removeByRef(prevFreeChunk.ref);
		}


		if (chunk.nextChunk && (chunk.nextChunk.ref.container === this.memoryChunksFree)) {
			// Chunk in memory that comes after the newly created free chunk is free
			// Combining free chunks in O(1)
			var nextFreeChunk = chunk.nextChunk;
			chunk.nBytes += nextFreeChunk.nBytes;
			chunk.nextChunk = nextFreeChunk.nextChunk;
			if (nextFreeChunk.nextChunk) {
				nextFreeChunk.nextChunk.prevChunk = chunk;
			}
			this.memoryChunksFree.removeByRef(nextFreeChunk.ref);
		}

		// Adding chunk to list of free memory chunks in O(log n)
		chunk.ref = this.memoryChunksFree.add(chunk);
		chunk.nLocks = 0;
		chunk.update = 0;
		delete this.chunksById[chunkId];
	}
};

SuperFastMemoryPartitioner.prototype.bindObject = function (chunkId, obj) {
	var chunk = this.chunksById[chunkId];
	if (chunk !== undefined) {
		chunk.obj = obj;
		return true;
	}
	return false;
};

SuperFastMemoryPartitioner.prototype._selectChunks = function (nBytesRequired) {
	// 3 Different cases can happen when looking for memory chunks to fit nBytes

	// Smallest free chunk of memory that can fit nBytes, in O(log n)
	// where n is the number of free chunks
	var freeChunk = this.memoryChunksFree.getSmallestAbove({ nBytes: nBytesRequired });
	if (freeChunk) {
		// Case 1 - Hooray! ichiban good case, we can use this chunk and only this chunk
		return [freeChunk];
	}

	if (this.memoryChunksUsed.count === 0) {
		// No free chunk have the required size and every available chunk is locked
		throw new Error('No available chunk can hold ' + nBytesRequired + ' Bytes.' +
			'Make sure that enough space is allocated (currently ' + this.nBytes + ')' +
			' or that locked chunks are correctly unlocked.');
	}

	// Used chunk of memory left unused for the longest period of time
	var usedChunkRef = this.memoryChunksUsed.first;
	if (usedChunkRef.object.nBytes >= nBytesRequired) {
		// Case 2 - Second best case, we can use this chunk and only this chunk
		return [usedChunkRef.object];
	}

	// Case 3 - General case, in O(m)
	// where m is the number of chunks required to fit nBytesRequired
	// Therefore the number of chunks iterated is the minimal number of chunks required to fit nBytesRequired
	// This operation is repeated nTrials times but the complexity remains O(m)
	// which is the minimum complexity that can be achieved for this kind of problem
	var i = 0;
	var nTrials = 7;
	var ageBest = Infinity;
	var chunksBest;
	while ((i < nTrials || ageBest === Infinity) && usedChunkRef !== null) {
		var usedChunk = usedChunkRef.object;
		var chunks = [usedChunk];
		var nBytes = usedChunk.nBytes;
		var prev = usedChunk.prevChunk;
		var next = usedChunk.nextChunk;
		var age = usedChunk.update;

		// Iterating through memory chunks neighbouring usedChunk
		while (nBytes < nBytesRequired) {
			if ((prev === null) || ((next !== null) && (next.update <= prev.update))) {
				// next is selected
				if (age < next.update) {
					age = next.update;
				}
				chunks.push(next);
				nBytes += next.nBytes;
				next = next.nextChunk;
			} else {
				// prev is selected
				if (age < prev.update) {
					age = prev.update;
				}
				chunks.unshift(prev);
				nBytes += prev.nBytes;
				prev = prev.prevChunk;
			}
		}

		if (age < ageBest) {
			ageBest = age;
			chunksBest = chunks;
		}

		usedChunkRef = usedChunkRef.next;
		i += 1;
	}

	if (ageBest === Infinity) {
		// No possible fit without having to touch a locked chunk
		throw new Error('No available chunk can hold ' + nBytesRequired + ' Bytes.' +
			'Make sure that enough space is allocated (currently ' + this.nBytes + ')' +
			' or that locked chunks are correctly unlocked.');
	}

	return chunksBest;
};

SuperFastMemoryPartitioner.prototype.reserve = function (chunkId, nBytesRequired) {
	var chunks = this._selectChunks(nBytesRequired);

	// Removing chunks from memory lists
	for (var c = 0; c < chunks.length; c += 1) {
		var chunk = chunks[c];
		if (chunk.ref.container === this.memoryChunksUsed) {
			this.memoryChunksUsed.removeByRef(chunk.ref);
			// Removing chunk from map
			delete this.chunksById[chunk.id];
		} else {
			this.memoryChunksFree.removeByRef(chunk.ref);
		}
	}

	var firstChunk = chunks[0];
	var lastChunk = chunks[chunks.length - 1];

	var start = firstChunk.start;
	var end = lastChunk.start + lastChunk.nBytes;

	// Reusing first chunk
	// Pointer to previous element in memory remains the same
	firstChunk.set(start, nBytesRequired, this.update);

	// Adding updated chunk to list of used memory chunks
	firstChunk.ref = this.memoryChunksUsed.add(firstChunk);
	firstChunk.id = chunkId;
	this.chunksById[chunkId] = firstChunk;

	var nAvailableBytes = end - start;
	if (nAvailableBytes === nBytesRequired) {
		// Using everything, youhou!
		firstChunk.nextChunk = lastChunk.nextChunk;
		if (firstChunk.nextChunk !== null) {
			firstChunk.nextChunk.prevChunk = firstChunk;
		}
	} else {
		// Some memory will be left over

		// Creating a new chunk if first and last chunks are the same
		// Otherwise using lastChunk
		var freeChunk;
		if (firstChunk === lastChunk) {
			freeChunk = new MemoryChunk(start + nBytesRequired, nAvailableBytes - nBytesRequired);
			// Next chunk in memory is the chunk pointed by lastChunk
			freeChunk.nextChunk = lastChunk.nextChunk;
			if (freeChunk.nextChunk !== null) {
				freeChunk.nextChunk.prevChunk = freeChunk;
			}
		} else {
			// Next chunk in memory remains the chunk pointed by lastChunk
			freeChunk = lastChunk;
			freeChunk.set(start + nBytesRequired, nAvailableBytes - nBytesRequired, 0);
		}

		// Making firstChunk and freeChunk point to each other
		freeChunk.prevChunk = firstChunk;
		firstChunk.nextChunk = freeChunk;


		// // This case never happens:
		// // i.e Chunk in memory that comes before the newly created free chunk is never free
		// if (freeChunk.prevChunk && freeChunk.prevChunk.isFree) {}


		// This case happens frequently:
		// i.e Chunk in memory that comes after the newly created free chunk can be free

		// This optimisation seems to reduce by 20% the unused memory
		// and by 10% the number of unused chunks
		// It also seems to speed up the selection of memory chunks
		if (freeChunk.nextChunk && (freeChunk.nextChunk.ref.container === this.memoryChunksFree)) {
			var nextFreeChunk = freeChunk.nextChunk;
			freeChunk.nBytes += nextFreeChunk.nBytes;
			freeChunk.nextChunk = nextFreeChunk.nextChunk;
			if (nextFreeChunk.nextChunk) {
				nextFreeChunk.nextChunk.prevChunk = freeChunk;
			}
			this.memoryChunksFree.removeByRef(nextFreeChunk.ref);
		}

		// Adding updated chunk to list of free memory chunks
		freeChunk.ref = this.memoryChunksFree.add(freeChunk);
	}

	// // Percentage of free memory, for performance assessment
	// var freeMemory = 0;
	// this.memoryChunksFree.forEach(function (chunk) {  freeMemory += chunk.nBytes; });
	// console.log('[Partitioner]', (100 * freeMemory / this.nBytes).toFixed(1),'% FREE');

	this.update += 1;
	return firstChunk;
};

SuperFastMemoryPartitioner.prototype.debug = function () {
	console.log('***** SFMP *****');
	console.log(' FREE CHUNKS');
	this.memoryChunksFree.forEach(function (chunk) {  console.log(chunk); });
	console.log(' USED CHUNKS');
	this.memoryChunksUsed.forEach(function (chunk) {  console.log(chunk); });
	console.log(' LOCKED CHUNKS');
	this.memoryChunksLocked.forEach(function (chunk) {  console.log(chunk); });
};



/*****************
 ** WEBPACK FOOTER
 ** ./src/views/engine/SuperFastMemoryPartitioner/index.js
 ** module id = 269
 ** module chunks = 0
 **/