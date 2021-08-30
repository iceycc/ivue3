'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function mount(el) {
    console.log(el);
}
function createRenderer() {
    return {
        createApp: function (component) {
            console.log('---11', component);
            return {
                mount: mount
            };
        }
    };
}

exports.createRenderer = createRenderer;
//# sourceMappingURL=runtime-core.cjs.js.map
