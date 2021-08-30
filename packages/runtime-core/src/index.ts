function mount(el) {
    console.log(el)
}

export function createRenderer() {

    return {
        createApp(component) {
            console.log('---11', component)
            return {
                mount
            }
        }
    }
}
