export default class Chunk {

	constructor(path) {
		this.path = path;
		this.assets = new Set();
	}

	addAsset(asset) {
		this.assets.add(asset);
	}
}