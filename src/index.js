import Bundler from "./Bundler.js";
import Chunker from "./Chunker.js";
import JavascriptLoader from "./loaders/JavascriptLoader.js";
import JsxLoader from "./loaders/JsxLoader.js";
import DefaultOutput from "./outputs/DefaultOutput.js";

export default function bundle(entry, output) {
	let bundler = new Bundler({
		entries: [entry],
		output: {
			directory: output
		}
	});

	bundler.addLoaders(/\.js$/i, [new JsxLoader(), new JavascriptLoader()]);
	bundler.setChunker(new Chunker());
	bundler.setOutput(new DefaultOutput());
	bundler.bundle();
}