import Bundler from "./Bundler.js";
import Chunker from "./Chunker.js";
import FileLoader from "./loaders/FileLoader.js";
import JavascriptLoader from "./loaders/JavascriptLoader.js";
import JsonLoader from "./loaders/JsonLoader.js";
import JsxLoader from "./loaders/JsxLoader.js";
import DefaultOutput from "./outputs/DefaultOutput.js";

export default function bundle(entry, output) {
	let bundler = new Bundler({
		entries: [entry],
		output: {
			directory: output
		}
	});

	bundler.addLoaders(/\.json$/i, [new JsonLoader()]);
	bundler.addLoaders(/\.[cm]?js$/i, [new JsxLoader(), new JavascriptLoader()]);
	bundler.addLoaders(/\.(css|svg|png|jpeg|gif|woff|woff2|ttf|otf|less|sass|scss)$/i, [new FileLoader()]);
	bundler.setChunker(new Chunker());
	bundler.setOutput(new DefaultOutput());
	bundler.bundle();
}