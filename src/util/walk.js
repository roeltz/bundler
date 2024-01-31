export default function walk(obj, filter, callback) {
	if (Array.isArray(obj)) {
		for (let i of obj) {
			walk(i, filter, callback);
		}
	} else if (typeof obj === "object" && obj !== null) {
		if (filter.includes(obj.type)) {
			callback(obj);
		}

		for (let k of Object.getOwnPropertyNames(obj)) {
			walk(obj[k], filter, callback);
		}
	}
}