"use strict";
(function () {
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
                children: [],
            },
        };
    }
    // 用 nextUnitOfWork 指向下一个要处理的 fiber 节点。
    let nextUnitOfWork = null;
    // 一个是当前正在处理的 fiber 链表的根 wipRoot
    let wipRoot = null;
    // 历史根root
    let currentRoot = null;
    let deletions = [];
    function render(element, container) {
        wipRoot = {
            dom: container,
            props: {
                children: [element],
            },
            alternate: currentRoot,
        };
        deletions = [];
        nextUnitOfWork = wipRoot;
    }
    // 处理fiber节点，在浏览器空闲时刻
    function workLoop(deadline) {
        let shouldYield = false;
        // console.log('nextUnitOfWork111', nextUnitOfWork)
        while (nextUnitOfWork && !shouldYield) {
            nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
            shouldYield = deadline.timeRemaining() < 1;
        }
        if (!nextUnitOfWork && wipRoot) {
            commitRoot();
        }
        // console.log('nextUnitOfWork', nextUnitOfWork)
        requestIdleCallback(workLoop);
    }
    requestIdleCallback(workLoop);
    const commitDeletion = (fiber, domParent) => {
        if (fiber === null || fiber === void 0 ? void 0 : fiber.dom) {
            domParent.removeChild(fiber.dom);
        }
        else {
            commitDeletion(fiber === null || fiber === void 0 ? void 0 : fiber.child, domParent);
        }
    };
    // 遍历fiebr链表，并执行effect 函数
    const commitWork = (fiber) => {
        var _a;
        if (!fiber)
            return;
        // 为什么非得找最外层的父元素 ？？ 
        let domParentFiber = fiber.return;
        while (!(domParentFiber === null || domParentFiber === void 0 ? void 0 : domParentFiber.dom)) {
            domParentFiber = domParentFiber === null || domParentFiber === void 0 ? void 0 : domParentFiber.return;
        }
        const domParent = domParentFiber.dom;
        if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
            domParent.appendChild(fiber.dom);
        }
        else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
            // 不知道啥意思
            updateDom(fiber.dom, (_a = fiber === null || fiber === void 0 ? void 0 : fiber.alternate) === null || _a === void 0 ? void 0 : _a.props, fiber.props);
        }
        else if (fiber.effectTag === 'DELETION') {
            commitDeletion(fiber, domParent);
        }
        commitWork(fiber.child);
        commitWork(fiber.sibling);
    };
    function isDepsEqual(deps, newDeps) {
        if (deps.length !== newDeps.length) {
            return false;
        }
        for (let i = 0; i < deps.length; i++) {
            if (deps[i] !== newDeps[i]) {
                return false;
            }
        }
        return true;
    }
    function commitEffectHooks() {
        function runCleanup(fiber) {
            var _a, _b;
            if (!fiber)
                return;
            (_b = (_a = fiber.alternate) === null || _a === void 0 ? void 0 : _a.effectHooks) === null || _b === void 0 ? void 0 : _b.forEach((hook, index) => {
                var _a;
                const deps = fiber.effectHooks[index].deps;
                if (!hook.deps || !isDepsEqual(hook.deps, deps)) {
                    (_a = hook.cleanup) === null || _a === void 0 ? void 0 : _a.call(hook);
                }
            });
            runCleanup(fiber.child);
            runCleanup(fiber.sibling);
        }
        function run(fiber) {
            var _a;
            if (!fiber)
                return;
            (_a = fiber.effectHooks) === null || _a === void 0 ? void 0 : _a.forEach((newHook, index) => {
                var _a;
                if (!fiber.alternate) {
                    newHook.cleanup = newHook.callback();
                    return;
                }
                if (!newHook.deps) {
                    newHook.cleanup = newHook.callback();
                }
                if (newHook.deps.length > 0) {
                    const oldHook = (_a = fiber.alternate) === null || _a === void 0 ? void 0 : _a.effectHooks[index];
                    if (!isDepsEqual(oldHook.deps, newHook.deps)) {
                        newHook.cleanup = newHook.callback();
                    }
                }
            });
            run(fiber.child);
            run(fiber.sibling);
        }
        runCleanup(wipRoot);
        run(wipRoot);
    }
    const commitRoot = () => {
        // 为什么要去 优先来去执行里面的删除dom的effect
        deletions.forEach(commitWork);
        commitWork(wipRoot.child);
        // 处理Effect 具体是哪里
        commitEffectHooks();
        currentRoot = wipRoot;
        //意义？
        wipRoot = null;
        deletions = [];
    };
    // fi根据fiber节点类型分类处理 ?? 具体怎么把fiber转化链表不太理解
    function performUnitOfWork(fiber) {
        console.log('fiber', fiber);
        const isFunctionComponent = fiber.type instanceof Function;
        if (isFunctionComponent) {
            updateFunctionComponent(fiber);
        }
        else {
            updateHostComponent(fiber);
        }
        if (fiber.child) {
            return fiber.child;
        }
        let nextFiber = fiber;
        while (nextFiber) {
            if (nextFiber.sibling) {
                return nextFiber.sibling;
            }
            //错误
            // nextFiber = nextFiber.parent;
            nextFiber = nextFiber.return;
        }
    }
    // 指向当前处理的Fiber
    let wipFiber = null;
    // 多个hook时通过序号进行区分
    let stateHookIndex = 0;
    function updateFunctionComponent(fiber) {
        wipFiber = fiber;
        stateHookIndex = 0;
        // 分别处理useState和useEffect 的值，不过这个到底是劣势value还是说整个hook对象
        wipFiber.stateHooks = [];
        wipFiber.effectHooks = [];
        console.log('fiberType', fiber);
        const children = [fiber.type(fiber.props)];
        console.log('children', children);
        reconcileChildren(fiber, children);
    }
    function updateHostComponent(fiber) {
        if (!fiber.dom) {
            fiber.dom = createDom(fiber);
        }
        reconcileChildren(fiber, fiber.props.children);
        console.log('fiberDom', fiber.dom);
    }
    /**
    * 根据 fiber 对象创建对应的 DOM 节点
    * @param fiber - 描述 DOM 节点的 fiber 对象
    * @returns 创建的 DOM 节点
    */
    function createDom(fiber) {
        const dom = fiber.type == "TEXT_ELEMENT"
            ? document.createTextNode("")
            : document.createElement(fiber.type);
        updateDom(dom, {}, fiber.props);
        return dom;
    }
    const isEvent = (key) => key.startsWith("on");
    const isProperty = (key) => key !== "children" && !isEvent(key);
    const isNew = (prev, next) => (key) => prev[key] !== next[key];
    const isGone = (prev, next) => (key) => !(key in next);
    // 更新元素dom，删除就属性，添加新属性//这个时候，就已经有dom了吗？
    function updateDom(dom, prevProps, nextProps) {
        //Remove old or changed event listeners
        Object.keys(prevProps)
            .filter(isEvent)
            .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
            .forEach((name) => {
            const eventType = name.toLowerCase().substring(2);
            dom.removeEventListener(eventType, prevProps[name]);
        });
        // Remove old properties
        Object.keys(prevProps)
            .filter(isProperty)
            .filter(isGone(prevProps, nextProps))
            .forEach((name) => {
            dom[name] = "";
        });
        // Set new or changed properties
        Object.keys(nextProps)
            .filter(isProperty)
            .filter(isNew(prevProps, nextProps))
            .forEach((name) => {
            dom[name] = nextProps[name];
        });
        // Add event listeners
        Object.keys(nextProps)
            .filter(isEvent)
            .filter(isNew(prevProps, nextProps))
            .forEach((name) => {
            const eventType = name.toLowerCase().substring(2);
            dom.addEventListener(eventType, nextProps[name]);
        });
    }
    // 递归处理子节点，逻辑较复杂，没太懂
    // 主体思路就是拿到旧的fiber 链，依次和新Vddom节点差异对比
    function reconcileChildren(wipFiber, elements) {
        var _a;
        let index = 0;
        let oldFiber = (_a = wipFiber.alternate) === null || _a === void 0 ? void 0 : _a.child;
        let prevSibling = null;
        while (index < elements.length || oldFiber != null) {
            const element = elements[index];
            let newFiber = null;
            const sameType = (element === null || element === void 0 ? void 0 : element.type) == (oldFiber === null || oldFiber === void 0 ? void 0 : oldFiber.type);
            // 新就type一样，只是去修改
            if (sameType) {
                newFiber = {
                    type: oldFiber === null || oldFiber === void 0 ? void 0 : oldFiber.type,
                    props: element.props,
                    dom: oldFiber === null || oldFiber === void 0 ? void 0 : oldFiber.dom,
                    return: wipFiber,
                    alternate: oldFiber,
                    effectTag: "UPDATE",
                };
            }
            if (element && !sameType) {
                newFiber = {
                    type: element.type,
                    props: element.props,
                    dom: null,
                    return: wipFiber,
                    alternate: null,
                    //增删改查的标记
                    effectTag: "PLACEMENT",
                };
            }
            if (oldFiber && !sameType) {
                oldFiber.effectTag = "DELETION";
                deletions.push(oldFiber);
            }
            if (oldFiber) {
                oldFiber = oldFiber.sibling;
            }
            if (index === 0) {
                wipFiber.child = newFiber;
            }
            else if (element) {
                prevSibling.sibling = newFiber;
            }
            prevSibling = newFiber;
            index++;
        }
        // 这里看出来 ，fiber其实就是一个对象
    }
    function useState(initialState) {
        var _a;
        const currentFiber = wipFiber;
        const oldHook = (_a = wipFiber === null || wipFiber === void 0 ? void 0 : wipFiber.alternate) === null || _a === void 0 ? void 0 : _a.stateHooks[stateHookIndex];
        // 这么写是对的吗
        const stateHook = {
            state: oldHook ? oldHook.state : initialState,
            queue: oldHook ? oldHook.queue : [],
        };
        stateHook.queue.forEach((action) => {
            stateHook.state = action(stateHook.state);
        });
        stateHook.queue = [];
        stateHookIndex++;
        wipFiber === null || wipFiber === void 0 ? void 0 : wipFiber.stateHooks.push(stateHook);
        function setState(action) {
            const isFunction = typeof action === "function";
            stateHook.queue.push(isFunction ? action : () => action);
            wipRoot = Object.assign(Object.assign({}, currentFiber), { alternate: currentFiber });
            nextUnitOfWork = wipRoot;
        }
        return [stateHook.state, setState];
    }
    const useEffect = (callback, deps) => {
        const effectHook = {
            callback,
            deps,
            //缺失22
            cleanup: undefined,
        };
        wipFiber === null || wipFiber === void 0 ? void 0 : wipFiber.effectHooks.push(effectHook);
    };
    const MiniReact = {
        createElement,
        render,
        useState,
        useEffect,
    };
    window.MiniReact = MiniReact;
})();
