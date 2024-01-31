import { realpath } from "fs/promises";
import { createRequire } from "module";
import Graph from "./Graph.js";
import { relative, resolve } from "path";
import Asset from "./Asset.js";

export default class Bundler {

	constructor(config) {
		this.config = config;
		this.graph = new Graph();
		this.loaders = [];
		this.currentDirectory = process.cwd();
	}

	async addAsset(asset, references) {
		this.graph.addAsset(asset);

		if (references) {
			for (let r of references) {
				let referencedAsset = await this.processPath(r.path, asset.path);
				this.graph.addAssetReference(asset, referencedAsset, r.metadata);
			}
		}
	}

	async addLoaders(pattern, loaders) {
		this.loaders.push({ pattern, loaders });
	}

	async bundle() {
		let entries = this.config.entries;

		for (let entry of entries) {
			let absoluteEntry = await this.resolveAbsolutePath(entry);
			let entryAsset = await this.processPath(absoluteEntry, this.currentDirectory);
			this.graph.setEntryAsset(entryAsset);
		}

		let chunks = await this.chunker.chunk(this);
		await this.output.write(chunks, this);
	}

	getLoadersForPath(path) {
		for (let { pattern, loaders } of this.loaders) {
			if (pattern.test(path)) {
				return loaders;
			}
		}
	}

	async processPath(path) {
		let existingAsset = this.graph.getAssetByPath(path);

		if (existingAsset) {
			return existingAsset;
		}

		let loaders = this.getLoadersForPath(path);

		if (loaders.length) {
			let asset = await Asset.fromPath(path);

			for (let loader of loaders) {
				let result = await loader.load(asset, this);
				asset = await this.processResult(result);
			}

			return asset;
		} else {
			throw new Error(`Loader not found for asset: ${path}`);
		}
	}

	async processResult(result) {
		await this.addAsset(result.asset, result.references);
		return result.asset;
	}

	async resolveAbsolutePath(path, directory = this.currentDirectory) {
		if (/^..?\//.test(path)) {
			return resolve(directory, path);
		} else {
			let require = createRequire(directory);
			return require.resolve(path);
		}
	}

	async resolveProjectPath(path, directory = this.currentDirectory) {
		let absolutePath = await this.resolveAbsolutePath(path, directory);
		let projectPath = relative(this.currentDirectory, absolutePath);
		return projectPath;
	}

	setChunker(chunker) {
		this.chunker = chunker;
	}

	setOutput(output) {
		this.output = output;
	}
}