import { isBuiltin } from "module";
import Graph from "./Graph.js";
import { dirname, isAbsolute, relative } from "path";
import Asset from "./Asset.js";
import { existsSync } from "fs";
import { realpath } from "fs/promises";
import resolve from "./util/resolve.js";

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
				let referencedAsset = await this.processPath(r.path, r.metadata.location);

				if (referencedAsset) {
					this.graph.addAssetReference(asset, referencedAsset, r.metadata);
				}
			}
		}
	}

	async addLoaders(pattern, loaders) {
		this.loaders.push({ pattern, loaders });
	}

	async bundle() {
		let entries = this.config.entries;

		this._processedPaths = [];

		for (let entry of entries) {
			let absoluteEntry = this.resolveAbsolutePath(entry);
			let entryAsset = await this.processPath(absoluteEntry);
			this.graph.addAsset(entryAsset);
			this.graph.setEntryAsset(entryAsset);
		}

		delete this._processedPaths;

		let chunks = await this.chunker.chunk(this);
		await this.output.write(chunks, this);
	}

	getLoadersForPath(path) {
		let absolutePath = this.resolveAbsolutePath(path);

		for (let { pattern, loaders } of this.loaders) {
			if (pattern.test(absolutePath)) {
				return loaders;
			}
		}
	}

	async processPath(path, contextLocation) {
		if (this._processedPaths.includes(path)) {
			console.log("ALREADY Processed:", path);
			return;
		}

		if (isBuiltin(path)) {
			return new Asset(`node:${path}`, `$$MODULE.exports = require("${path}")`);
		}

		let existingAsset = this.graph.getAssetByPath(path);

		if (existingAsset) {
			console.log("Existing:", path);
			return existingAsset;
		}

		let loaders = this.getLoadersForPath(path, dirname(path));

		if (loaders) {
			let asset = await Asset.fromPath(path);

			for (let loader of loaders) {
				let result = await loader.load(asset, this);
				this._processedPaths.push(asset.path);
				await this.addAsset(result.asset, result.references);
				asset = result.asset;
			}

			console.log("Processed:", path);

			return asset;
		} else {
			if (contextLocation) {
				throw new Error(`Loader not found for asset: ${path} (Requested from ${contextLocation.path}:${contextLocation.line}:${contextLocation.column})`);
			} else {
				throw new Error(`Loader not found for asset: ${path}`);
			}
		}
	}

	resolveAbsolutePath(path, directory = this.currentDirectory) {
		if (isBuiltin(path)) {
			return path;
		}

		if (existsSync(path) && isAbsolute(path)) {
			return path;
		}

		try {
			return resolve(path, directory);
		} catch (err) {
			debugger;
		}
	}

	resolveProjectPath(path, directory = this.currentDirectory) {
		if (isBuiltin(path)) {
			return path;
		}

		let absolutePath = this.resolveAbsolutePath(path, directory);
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