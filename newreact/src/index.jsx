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
  return (
    <div>
      <p>{count}</p>
      <button onClick={handleClick}>加一</button>
    </div>
  );
}

MyRender(<App />, document.getElementById("root"));
