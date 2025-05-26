import { useEffect, useState } from "react";
import { run } from "./api/api";
import "./App.css";
import DAGListener from "./components/DAGListener";
import Invitation from "./components/Invitation";
import { selectPipeline } from "./api/api";
import "./index.css";

function App() {
  const [selectedOption, setSelectedOption] = useState("POSTED_WORKER");
  useEffect(() => {
    run();
  }, []);

  return (
    <div className="flex flex-col">
      <div className="App justify-center items-center flex flex-row w-full">
        <div className="flex flex-col">
          <Invitation />
        </div>
        <div className="flex flex-col">
          <DAGListener />
        </div>
      </div>
      <select
        value={selectedOption}
        onChange={(e) => {
          console.log(e.target.value);
          selectPipeline(e.target.value);
          run();
        }}
        className="text-black max-w-xs self-center"
      >
        <option value="POSTED_WORKER">Select a pipeline</option>
        <option value="POSTED_WORKER">Posted Worker Pipeline</option>
        <option value="ISSUANCE">Issuance Pipeline</option>
        <option value="NYC_GAN_MEETING">
          Select October 17 NYC GAN Meeting
        </option>
      </select>

      <button
        className="btn btn-primary max-w-xs mt-4 self-center"
        onClick={() => {
          run();
        }}
      >
        Refresh
      </button>
    </div>
  );
}

export default App;
