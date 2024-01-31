import { parse } from "acorn";
import Loader from "../Loader.js";
import walk from "../util/walk.js";
import { basename, dirname } from "path";
import LoaderResult from "../LoaderResult.js";

export const IMPORT = 0;
export const EXPORT = 1;
export const STATIC_IMPORT = 0;
export const DYNAMIC_IMPORT = 1;
export const COMMONJS_IMPORT = 2;
export const CONST_EXPORT = 0;
export const LET_EXPORT = 1;

export default class JavascriptLoader extends Loader {

	constructor() {
		super();
	}

	async load(asset, bundler) {
		let source = asset.content;
		let projectPath = await bundler.resolveProjectPath(asset.path);
		let program = await this.parse(source);
		let imports = await this.getImports(program, dirname(asset.path), bundler);
		let exports = await this.getExports(program, source);
		let statements = []
			.concat(imports.map(i => ({ type: IMPORT, info: i })))
			.concat(exports.map(e => ({ type: EXPORT, info: e })))
			.sort((a, b) => a.info.start - b.info.start);

		source = await this.transform(source, statements);
		source = await this.addSourceWrapper(source, imports, projectPath);
		asset.content = source;

		let result = new LoaderResult(asset);

		for (let i of imports) {
			result.addPathReference(i.absolutePath, { async: i.type === DYNAMIC_IMPORT });
		}

		return result;
	}

	async getExports(program, source) {
		let exports = [];

		walk(program, ["ExportDefaultDeclaration", "ExportNamedDeclaration"], node => exports.push(node));

		return Promise.all(exports.map(async e => {
			if (e.type === "ExportDefaultDeclaration") {
				return {
					start: e.start,
					end: e.end,
					declarations: [this.normalizeExportDeclaration(source, e.declaration, "const", true)]
				};
			} else if (e.type === "ExportNamedDeclaration") {
				return {
					start: e.start,
					end: e.end,
					declarations: e.declaration.declarations
						? e.declaration.declarations.map(n => this.normalizeExportDeclaration(source, n, e.declaration.kind))
						: [this.normalizeExportDeclaration(source, e.declaration, e.declaration.kind)]
				};
			}
		}));
	}

	async getImports(program, directory, bundler) {
		let imports = [];

		walk(program, ["ImportDeclaration", "ImportExpression", "CallExpression"], node => imports.push(node));

		return Promise.all(imports.map(async (i, n) => {
			if (i.type === "ImportDeclaration") {
				return {
					type: STATIC_IMPORT,
					path: i.source.value,
					identifier: basename(i.source.value).replace(/[.@/-]+/g, "_") + `_${n}`,
					absolutePath: await bundler.resolveAbsolutePath(i.source.value, directory),
					projectPath: await bundler.resolveProjectPath(i.source.value, directory),
					start: i.start,
					end: i.end,
					symbols: i.specifiers.map(s => {
						let imported = s.type === "ImportDefaultSpecifier" ? "default" : s.imported.name;
						let local = s.local.name;
						return {
							imported,
							local,
							equal: imported === local
						};
					})
				};
			} else if (i.type === "ImportExpression" && i.source.type === "Literal") {
				return {
					type: DYNAMIC_IMPORT,
					path: i.source.value,
					absolutePath: await bundler.resolveAbsolutePath(i.source.value, directory),
					projectPath: await bundler.resolveProjectPath(i.source.value, directory),
					start: i.start,
					end: i.end
				};
			} else if (i.type === "CallExpression" && i.callee.name === "require") {
				let path = i.arguments[0].value;
				return {
					path,
					type: COMMONJS_IMPORT,
					identifier: path.replace(/[.@/-]+/g, "_") + `_${n}`,
					absolutePath: await bundler.resolveAbsolutePath(path, directory),
					projectPath: await bundler.resolveProjectPath(path, directory),
					start: i.start,
					end: i.end
				}
			}
		})).then(imports => imports.filter(i => !!i));
	}

	normalizeExportDeclaration(source, node, kind, isDefault = false) {
		let name = isDefault ? "default" : node.id.name;
		let type;
		let value;

		if (node.type === "FunctionDeclaration") {
			type = CONST_EXPORT;
			value = source.slice(node.start, node.end);
		} else {
			type = kind === "let" ? LET_EXPORT : CONST_EXPORT;
			value = isDefault ? node.name : node.init.raw;
		}

		return { type, name, value };
	}

	async parse(source) {
		return parse(source, { ecmaVersion: "latest", sourceType: "module" });
	}

	async addSourceWrapper(source, imports, projectPath) {
		let staticImports = imports.filter(i => i.type === STATIC_IMPORT);
		let commonJSImports = imports.filter(i => i.type === COMMONJS_IMPORT);
		let importsSnippet = ("[\n" + staticImports.concat(commonJSImports).map(i => JSON.stringify(i.projectPath)).join(",\n") + "\n]").replace(/\n\n/, "");
		let paramsSnippet = ["$$MODULE"].concat(staticImports.map(i => i.identifier)).join(", ");
		let snippet = `$$MODULE(${JSON.stringify(projectPath)}, ${importsSnippet}, function(${paramsSnippet}){\nconst module = $$MODULE, exports = $$MODULE.exports;\n${source}\n\n});`;
		return snippet;
	}

	async transform(source, statements) {
		if (statements.length) {
			let s = statements[0];
			let snippet = s.type === IMPORT ? this.transformImportSnippet(s.info) : this.transformExportSnippet(s.info);
			let sourceBefore = source.slice(0, Math.max(0, s.info.start));
			let sourceAfter = source.slice(s.info.end);
			let transformedSource = sourceBefore + snippet + sourceAfter;
			let offset = snippet.length - (s.info.end - s.info.start);
			let offsetStatements = statements.slice(1).map(s => {
				s = structuredClone(s);
				s.info.start += offset;
				s.info.end += offset;
				return s;
			});
			return this.transform(transformedSource, offsetStatements);
		} else {
			return source;
		}
	}

	transformExportSnippet(exportInfo) {
		let snippet = exportInfo.declarations.map(d => `$$MODULE.exports.${d.name} = ${d.value};`).join("\n");
		return snippet;
	}

	transformImportSnippet(importInfo) {
		switch (importInfo.type) {
			case STATIC_IMPORT:
				return this.transformStaticImport(importInfo);
			case DYNAMIC_IMPORT:
				return this.transformDynamicImport(importInfo);
			case COMMONJS_IMPORT:
				return this.transformCommonJSImport(importInfo);
		}
	}

	transformStaticImport(importInfo) {
		let normalizedSymbols = importInfo.symbols.map(s => s.equal ? s.local : `${s.imported} : ${s.local}`).join(", ");
		let snippet = `const { ${normalizedSymbols} } = ${importInfo.identifier};`;
		return snippet;
	}

	transformDynamicImport(importInfo) {
		let snippet = `$$MODULE.import(${JSON.stringify(importInfo.projectPath)})`;
		return snippet;
	}

	transformCommonJSImport(importInfo) {
		let snippet = `$$MODULE.require(${JSON.stringify(importInfo.projectPath)})`;
		return snippet;
	}
}