import { readFile } from "fs/promises";

export default class Asset {

	static async fromPath(path) {
		let content = await readFile(path, { encoding: "utf-8" });
		return new Asset(path, content);
	}

	constructor(path, content) {
		this.path = path;
		this.content = content;
	}
}