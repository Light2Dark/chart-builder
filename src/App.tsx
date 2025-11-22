import { ChartBuilder } from "./charts/chart-builder";
import { DuckDBWASMConnector } from "@uwdata/mosaic-core";
import { coordinator } from "@uwdata/vgplot";
import { Logger } from "./utils/logger";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import React from "react";
import { Analytics } from "@vercel/analytics/react";

const queryClient = new QueryClient();

// Lazy load the production version of devtools
const ReactQueryDevtoolsProduction = React.lazy(() =>
  import("@tanstack/react-query-devtools/build/modern/production.js").then(
    (d) => ({
      default: d.ReactQueryDevtools,
    }),
  ),
);

function App() {
  const [showDevtools, setShowDevtools] = React.useState(false);

  React.useEffect(() => {
    // @ts-expect-error - window.toggleDevtools is not typed
    window.toggleDevtools = () => setShowDevtools((old) => !old);
  }, []);

  Logger.debug("App initialized");
  const duckdbWasmConnector = new DuckDBWASMConnector();
  const vgCoordinator = coordinator();
  vgCoordinator.databaseConnector(duckdbWasmConnector);
  Logger.debug("VG Coordinator initialized with DuckDB WASM Connector");

  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />
      {showDevtools && (
        <React.Suspense fallback={null}>
          <ReactQueryDevtoolsProduction />
        </React.Suspense>
      )}
      <div className="flex flex-col items-center mt-10">
        <h1 className="text-2xl font-bold">Build charts rapidly ⚡</h1>
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
          <ChartBuilder
            coordinator={vgCoordinator}
            duckdb={duckdbWasmConnector}
          />
        </div>
      </div>
      <Analytics />
    </QueryClientProvider>
  );
}

export default App;
