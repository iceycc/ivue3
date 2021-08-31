'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var isObject = function (val) { return typeof val == 'object' && val !== null; };
var hasOwn = function (target, key) { return Object.prototype.hasOwnProperty.call(target, key); };
var isArray = function (val) { return Array.isArray(val); };
var hasChange = function (oldVal, newVal) { return oldVal !== newVal; };
var isFunction = function (val) { return typeof val === 'function'; };
var isString = function (val) { return typeof val === 'string'; };

exports.hasChange = hasChange;
exports.hasOwn = hasOwn;
exports.isArray = isArray;
exports.isFunction = isFunction;
exports.isObject = isObject;
exports.isString = isString;
//# sourceMappingURL=shared.cjs.js.map
