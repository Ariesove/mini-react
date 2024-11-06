function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) => {
        const isTextNode =
          typeof child === "string" || typeof child === "number";
        return isTextNode ? createTextNode(child) : child;
      }),
    },
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

const MiniReact = {
  createElement,
};
// 用 nextUnitOfWork 指向下一个要处理的 fiber 节点。
let nextUnitOfWork = null;
// 一个是当前正在处理的 fiber 链表的根 wipRoot
let wipRoot = null;
// 历史根root
let currentRoot = null;
let deletions = null;
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
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);


const commitDeletion = (fiber, domParent) => { 
  if(fiber.dom) {
    domParent.removeChild
 }else {
    commitDeletion(fiber.child, domParent)
 }

}
// 遍历fiebr链表，并执行effect 函数
const commitWork = (fiber) => {
  if (!fiber) return

  // 为什么非得找最外层的父元素 ？？ 
  let domParentFiber = fiber.return
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.return
  }
  const domParent = domParentFiber.dom

  if(fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  }else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    // 不知道啥意思
    updateDom(fiber.dom, fiber.alternate.props, fiber.props)

  }else if(fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent)
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
}

const commitRoot = () => {
  // 为什么要去 优先来去执行里面的删除dom的effect
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  //意义？
  wipRoot = null;
  deletions = []
}

function performUnitOfWork(fiber) {
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.return;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }
}

// fi根据fiber节点类型分类处理
function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
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
    nextFiber = nextFiber.parent;
  }
}


// 指向当前处理的Fiber
let wipFiber = null;
// 多个hook时通过序号进行区分
let stateHookIndex = null;

function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  stateHookIndex = 0;
  // 分别处理useState和useEffect 的值，不过这个到底是劣势value还是说整个hook对象
  wipFiber.stateHooks = [];
  wipFiber.effectHooks = [];

  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, fiber.props.children);
}

function createDom(fiber) {
  const dom =
    fiber.type == "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);

  updateDom(dom, {}, fiber.props);

  return dom;
}

const isEvent = (key) => key.startsWith("on");
const isProperty = (key) => key !== "children" && !isEvent(key);
const isNew = (prev, next) => (key) => prev[key] !== next[key];
const isGone = (prev, next) => (key) => !(key in next);

// 更新元素dom，删除就属性，添加新属性
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
// 主体思路就是拿到旧的fiber 链，依次和新fiber节点差异对比
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate?.child;
  let prevSibling = null;

  while (index < elements.length || oldFiber != null) {
    const element = elements[index];
    let newFiber = null;

    const sameType = element?.type == oldFiber?.type;
    // 新就type一样，只是去修改
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
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
    } else if (element) {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
  // 这里看出来 ，fiber其实就是一个对象
}

const useState = (initialState) => {
  // 定义初始值

  //  循环执行传递的action，修改当前state
  const currentFiber = wipFiber;

  // 保持新旧hooks 方便差异化对比更新
  const oldHook = wipFiber.alternate?.stateHooks[stateHookIndex];

  // 从结构上来讲
  const stateHook = {
    queue: oldHook?.queue ? oldHook.queue : [],
    state: oldHook?.state ? oldHook?.state : initialState,
  };
  // 我不太理解这里的逻辑，就是为什么，每次都需要上一个旧值呢，不是用当前最新值
  stateHook.queue.forEach((action) => {
    stateHook.state = action(stateHook.state);
  });
  stateHook.queue = []
  // 存在setState(1);setState(1 );setState(1)
  stateHookIndex++;
  const setState = (action) => {
    const isFunction = typeof action === "function";
    stateHook.queue.push(isFunction ? action : () => action);
  };

  wipRoot = {
    ...currentFiber,
    alternate: currentFiber,
  }
  // 不是很理解，我觉得，下一个遍历的fiber节点不是wipRoot 吧，这个只是一个根节点
  nextUnitOfWork = wipRoot;
  return {
    state,
    setState,
  };


};
const useEffect = (callback, deps) => {
  const effectHook = {
    callback,
    deps,

  }
  wipFiber.effectHooks.push(effectHook);
}
window.MiniReact = MiniReact;
