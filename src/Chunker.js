import Asset from "./Asset.js";
import Chunk from "./Chunk.js";

export default class Chunker {

	constructor(options) {
		this.options = options;
	}

	async chunk(bundler) {
		let chunk = new Chunk("dist.js");
		let chunks = [chunk];

		chunk.addAsset(await Asset.fromPath("src/runtime.js"));

		for (let asset of bundler.graph.assets) {
			chunk.addAsset(asset);
		}

		return chunks;
	}
}