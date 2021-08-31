export const nodeOps = {
    createElement(type) {
        return document.createElement(type)
    },
    insert(child, parent, anchor = null) {
        // anchor == null appendChild
        parent.insertBefore(child, anchor)
    },
    remove(child) {
        const parent = child.parentNode
        if (parent) {
            parent.removeChild(child)
        }
    },
    setElementText(node, text: string) {
        node.textContent = text
    },
    createTextNode(content) {
        return document.createTextNode(content)
    }
}
