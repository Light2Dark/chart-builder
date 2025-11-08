import { ChartBuilder } from "./chart-builder";
import { DuckDBWASMConnector } from "@uwdata/mosaic-core";
import { coordinator } from "@uwdata/vgplot";
import { Logger } from "./utils/logger";

function App() {
  Logger.debug("App initialized");
  const duckdbWasmConnector = new DuckDBWASMConnector();
  const vgCoordinator = coordinator();
  vgCoordinator.databaseConnector(duckdbWasmConnector);
  Logger.debug("VG Coordinator initialized with DuckDB WASM Connector");

  return (
    <div className="flex flex-col items-center mt-10">
      <h1 className="text-2xl font-bold">Chart Builder</h1>
      <p className="text-sm text-gray-500">
        Powered by{" "}
        <a
          className="text-blue-700 underline"
          href="https://idl.uw.edu/mosaic/"
          target="_blank"
          rel="noopener"
        >
          mosaic
        </a>
      </p>
      <div className="mt-6">
        <ChartBuilder coordinator={vgCoordinator} />
      </div>
    </div>
  );
}

export default App;
