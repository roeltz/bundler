import esbuild from "esbuild";
import LoaderResult from "../LoaderResult.js";

export default class JsxLoader {

	constructor() {

	}

	async load(asset, bundler) {
		let source = asset.content;
		let transformedSource = await esbuild.transform(source, {
			loader: "jsx",
			jsx: "transform"
		});
		asset.content = transformedSource.code;

		return new LoaderResult(asset);
	}
}