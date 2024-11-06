"use strict";
function createElement(type, props, ...children) {
    return {
        type,
        props: Object.assign(Object.assign({}, props), { children: children.map((child) => {
                const isTextNode = typeof child === "string" || typeof child === "number";
                return isTextNode ? createTextNode(child) : child;
            }) }),
    };
}
function createTextNode(nodeValue) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue,
            children: []
        },
    };
}
const MiniReact = {
    createElement
};
window.MiniReact = MiniReact;
