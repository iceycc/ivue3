var isObject = function (val) { return typeof val == 'object' && val !== null; };
var hasOwn = function (target, key) { return Object.prototype.hasOwnProperty.call(target, key); };
var isArray = function (val) { return Array.isArray(val); };
var hasChange = function (oldVal, newVal) { return oldVal !== newVal; };
var isFunction = function (val) { return typeof val === 'function'; };
var isString = function (val) { return typeof val === 'string'; };

export { hasChange, hasOwn, isArray, isFunction, isObject, isString };
//# sourceMappingURL=shared.esm-bundler.js.map
