export const isObject = (val: unknown): val is Object => typeof val == 'object' && val !== null;
export const hasOwn = (target, key) => Object.prototype.hasOwnProperty.call(target, key);
export const isArray = (val) => Array.isArray(val)
export const hasChange = (oldVal,newVal)=>oldVal !== newVal
export const isFunction = (val) => typeof val === 'function'
export const isString = (val) => typeof val === 'string'
export * from './ShapeFlags'
