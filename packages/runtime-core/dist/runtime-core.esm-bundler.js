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

export { createRenderer };
//# sourceMappingURL=runtime-core.esm-bundler.js.map
