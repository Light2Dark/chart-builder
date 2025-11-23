import {
  plot,
  width,
  gridX,
  gridY,
  count,
  from,
  barY,
  lineY,
  axisX,
  rectY,
  axisY,
} from "@uwdata/vgplot";
import type { ChartForm } from "./types";
import { Logger, logNever } from "@/utils/logger";
import { getSimplifiedDataType, type TableSummary } from "./data";

export const NULL_VALUE = "";
export const COUNT_FIELD = "__count__";
const COUNT_FIELD_LABEL = "Count of Records";

// https://idl.uw.edu/mosaic/api/vgplot/marks.html
// Mosaic documentation points to using Observable as a close reference point.

export function specChart(
  formValues: ChartForm,
  tableName: string,
  data: TableSummary,
): HTMLElement | null {
  let chart: HTMLElement | null = null;

  if (!formValues.x || !formValues.y) {
    return null;
  }

  const xColumn = data.columns.get(formValues.x);
  const yColumn =
    formValues.y === COUNT_FIELD ? COUNT_FIELD : data.columns.get(formValues.y);

  if (!xColumn || !yColumn) {
    Logger.error("X or Y column's data is not found");
    return null;
  }

  // Important for default values to be applied first,
  // Some values like grid lines, if applied after the chart, will overlay it
  const defaultValues = [
    width(700),
    gridX(),
    gridY(),
    axisY({
      label: formValues.y === COUNT_FIELD ? COUNT_FIELD_LABEL : formValues.y,
    }),
    axisX({
      // ticks: 10,
      // interval: 10,
      // tickSpacing: 100,
    }),
  ];

  // https://observablehq.com/plot/features/marks#mark-options
  // https://github.com/uwdata/mosaic/blob/3353220cc43ac9f5a8dfdba8ea9cf96cf38e8173/packages/vgplot/spec/src/spec/marks/Marks.ts#L432
  const markValues: Record<string, unknown> = {
    x: formValues.x,
    y: formValues.y === COUNT_FIELD ? count() : formValues.y,
    tip: true,
  };

  const xDataType = getSimplifiedDataType(xColumn.dataType);

  const args = [from(tableName)];
  switch (formValues.chartType) {
    case "grouped-column": {
      markValues.fill = "steelblue";
      const mark =
        xDataType === "temporal" || xDataType === "quantitative" ? rectY : barY;
      chart = plot(...defaultValues, mark(...args, markValues));
      break;
    }
    case "line":
      chart = plot(...defaultValues, lineY(...args, markValues));
      break;
    case "stacked-column":
      Logger.warn("Stacked column not implemented");
      break;
    case "100-stacked-column":
      Logger.warn("Grouped 100% stacked column not implemented");
      break;
    case "bar":
      Logger.warn("Bar not implemented");
      break;
    default:
      logNever(formValues.chartType);
  }

  return chart;
}
