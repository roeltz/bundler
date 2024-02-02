import LoaderResult from "../LoaderResult.js";

export default class JsonLoader {

	async load(asset, bundler) {
		asset.content = `$$MODULE.exports = ${asset.content};`;
		return new LoaderResult(asset);
	}
}