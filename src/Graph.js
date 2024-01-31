import Asset from "./Asset.js";
import AssetReference from "./AssetReference.js";

export default class Graph {

	constructor() {
		this.assets = new Set();
		this.assetsIndex = new Map();
		this.references = new Map();
		this.entryAssets = new Set();
	}

	addAsset(asset) {
		this.assets.add(asset);
		this.assetsIndex.set(asset.path, asset);
	}

	addAssetReference(assetA, assetB, metadata) {
		if (!this.references.has(assetA)) {
			this.references.set(assetA, []);
		}

		this.references.get(assetA).push(new AssetReference(assetB, metadata));
	}

	computeDependencyTree(assets = this.entryAssets) {
		let tree = new Map();

		for (let asset of assets) {
			let referencedAssets = this.references.get(asset)?.map(ref => ref.asset) || [];
			let subtree = this.computeDependencyTree(referencedAssets);
			let subtreeSize = [...subtree.values()].map(i => i.size).reduce((total, size) => total + size, 0);

			tree.set(asset, {
				references: subtree,
				size: asset.content.length,
				subtreeSize
			});
		}

		return tree;
	}

	getAssetByPath(path) {
		return this.assetsIndex[path];
	}

	setEntryAsset(asset) {
		this.entryAssets.add(asset);
	}
}