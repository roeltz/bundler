import LoaderResult from "../LoaderResult.js";

export default class FileLoader {

	async load(asset, bundler) {
		asset.content = `$$MODULE.exports = ${JSON.stringify(asset.content)};`;
		return new LoaderResult(asset);
	}
}