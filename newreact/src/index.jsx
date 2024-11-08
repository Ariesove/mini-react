const { render, useState, useEffect } = window.MiniReact;

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
    help() === 1 && (
      <div>
        <p>{count}</p>
        <button onClick={handleClick}>加一</button>
      </div>
    )
  );
}

render(<App />, document.getElementById("root"));
