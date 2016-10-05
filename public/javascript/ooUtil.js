// infrastructure code (from "JavaScript: The Definitive Guide (6th ed.)" by David Flanagan)
// Tested in Chrome, Firefox, Safari browsers and node.
// p. 119
function inherit(p) {
	if (p === null) { throw TypeError; }
	if (Object.create) {
		return Object.create(p);
	}
}
// simplified version, p. 179
function extend(o) {
	for(var i = 1; i < arguments.length; i++) {
		var source = arguments[i];
		for(var prop in source) o[prop] = source[prop];
	}
	return o;
}

