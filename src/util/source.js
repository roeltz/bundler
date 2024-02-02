export function computeSourceLocation(source, path, start, end) {
	let sourceBefore = source.slice(0, start);
	let matches = [...sourceBefore.matchAll(/\r?\n/gm)];
	let line = matches.length + 1;
	let column = start - (matches.length ? matches[matches.length - 1].index + 1 : 0) + 1;

	return { path, line, column, start, end };
}