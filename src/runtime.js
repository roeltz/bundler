const process = { env: { NODE_ENV: "production" } };
const RESOLVE_MODULE = Symbol();
const REJECT_MODULE = Symbol();

class PendingModule {

	constructor(id) {
		this.id = id;
		this.loading = false;
		this.promise = new Promise((rs, rj) => {
			this[RESOLVE_MODULE] = rs;
			this[REJECT_MODULE] = rj;
		});
	}

	isLoading() {
		return this.loading;
	}

	resolve(module) {
		this[RESOLVE_MODULE](module);
	}

	reject(err) {
		this[REJECT_MODULE](err);
	}

	setLoading(callback) {
		if (!this.loading) {
			this.loading = true;
			callback();
		}
	}
}

class ModuleManager {

	static global() {
		if (!globalThis.$$MODULE_MANAGER) {
			globalThis.$$MODULE_MANAGER = new ModuleManager();
		}

		globalThis.$$MODULE = (...args) => globalThis.$$MODULE_MANAGER.setModule(...args);
	}

	constructor() {
		this.modules = new Map();
	}

	async getModule(id) {
		let currentValue = this.modules.get(id) || this.setPendingModule(id);

		if (currentValue instanceof PendingModule) {
			return currentValue.promise;
		} else {
			return currentValue;
		}
	}

	getModuleSync(id) {
		let currentValue = this.modules.get(id);
		return currentValue;
	}

	async setModule(id, dependencies, module) {
		let currentValue = this.modules.get(id) || this.setPendingModule(id);

		if (currentValue instanceof PendingModule) {
			let loadedDependencies = await Promise.all(dependencies.map(d => this.getModule(d)));
			let moduleScope = {
				exports: {},
				import: id => this.getModule(id),
				require: id => this.getModuleSync(id)
			};
			module(moduleScope, ...loadedDependencies);

			if (!("default" in moduleScope.exports)) {
				moduleScope.exports.default = moduleScope.exports;
			}

			currentValue.resolve(moduleScope.exports);
			this.modules.set(id, moduleScope.exports);
		} else {
			console.warn("Module already initialized:", id);
		}
	}

	setPendingModule(id) {
		let pm = new PendingModule(id);
		this.modules.set(id, pm);
		return pm;
	}
}

ModuleManager.global();