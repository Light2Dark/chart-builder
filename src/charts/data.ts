import { assertNever } from "../utils/asserts";

export const DATASETS = ["Seattle Weather", "Stock Prices"] as const;
export type Dataset = (typeof DATASETS)[number];

export function getDatasetUrl(dataset: Dataset) {
  switch (dataset) {
    case "Seattle Weather":
      return "https://raw.githubusercontent.com/uwdata/mosaic/901e0da302bb3a009d463c959f09ddb17049ecc0/data/seattle-weather.csv";
    case "Stock Prices":
      return "https://raw.githubusercontent.com/uwdata/mosaic/901e0da302bb3a009d463c959f09ddb17049ecc0/data/stocks.csv";
    default:
      assertNever(dataset);
  }
}

export const DatasetToTableName: Record<Dataset, string> = {
  "Seattle Weather": "weather",
  "Stock Prices": "stocks",
};
