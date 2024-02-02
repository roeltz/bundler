import enhancedResolve from "enhanced-resolve";
import { dirname, resolve as nodeResolve } from "path";
import { readFileSync } from "fs";

export default function resolve(path, contextDirectory) {
	try {
		let result = enhancedResolve.sync({}, contextDirectory, path);
		return result;
	} catch (err) {
		if (/Package path (.+?) is not exported from package .+? \(see exports field in (.+?)\)/.test(err.message)) {
			let { $1: request, $2: packagePath } = RegExp;
			let packageInfo = JSON.parse(readFileSync(packagePath, { encoding: "utf8" }));
			let { exports } = packageInfo;
			let exportPath;

			if (typeof exports === "string") {
				exportPath = exports;
			} else if (typeof exports === "object") {
				if (request in exports) {
					let requestExports = exports[request];
					if (typeof requestExports === "string") {
						exportPath = requestExports;
					} else if (typeof requestExports === "object") {
						exportPath = requestExports.import?.default || requestExports.import || requestExports.require?.default || requestExports.require;
					}
				} else {
					exportPath = exports.import?.default || exports.import || exports.require?.default || exports.require;
				}
			}

			if (exportPath) {
				let result = nodeResolve(dirname(packagePath), exportPath);
				return result;
			}
		}
		throw err;
	}
}