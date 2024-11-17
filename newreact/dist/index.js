"use strict";
console.log(window.MiniReact);
const { render: MyRender, useState, useEffect } = window.MiniReact;
function App() {
    const [count, setCount] = useState(0);
    function handleClick() {
        setCount((count) => count + 1);
    }
    useEffect(() => {
        // const timer = setInterval(() => {
        //   console.log("2", 2);
        //   setCount((count) => count + 1);
        // }, 1000);
        return () => {
            clearInterval(timer);
        };
    }, []);
    const help = () => {
        console.log(11);
        return 1;
    };
    return (MiniReact.createElement("div", null,
        MiniReact.createElement("p", null, count),
        MiniReact.createElement("button", { onClick: handleClick }, "\u52A0\u4E00")));
}
MyRender(MiniReact.createElement(App, null), document.getElementById("root"));
