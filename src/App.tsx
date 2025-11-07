import { ChartBuilder } from "./chart-builder";

function App() {
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
				<ChartBuilder />
			</div>
		</div>
	);
}

export default App;
