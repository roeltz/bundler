import PathReference from "./PathReference.js";

export default class LoaderResult {

	constructor(asset) {
		this.asset = asset;
		this.references = [];
	}

	addPathReference(path, metadata) {
		this.references.push(new PathReference(path, metadata));
	}
}