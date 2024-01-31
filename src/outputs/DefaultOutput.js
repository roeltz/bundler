import { writeFile } from "fs/promises";
import Output from "../Output.js";

export default class DefaultOutput extends Output {

	async write(chunks, bundler) {
		for (let chunk of chunks) {
			let content = "";

			for (let asset of chunk.assets) {
				content += `${asset.content}\n/*${"*".repeat(50)}*/\n`;
			}

			writeFile(chunk.path, content, { encoding: "utf-8" });
		}
	}
}