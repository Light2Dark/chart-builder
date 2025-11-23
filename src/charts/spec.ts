import {
  plot,
  width,
  gridX,
  gridY,
  count,
  from,
  barY,
  lineY,
} from "@uwdata/vgplot";
import type { ChartForm } from "./types";
import { Logger, logNever } from "@/utils/logger";

export const NULL_VALUE = "";
export const COUNT_FIELD = "__count__";

// https://idl.uw.edu/mosaic/api/vgplot/marks.html
// Mosaic documentation points to using Observable as a close reference point.

export function specChart(
  formValues: ChartForm,
  tableName: string,
): HTMLElement | null {
  let chart: HTMLElement | null = null;

  // Important for default values to be applied first,
  // Eg. adding grid lines after the chart will overlay it
  const defaultValues = [width(700), gridX(), gridY()];

  const markValues: Record<string, unknown> = {
    x: formValues.x,
    y: formValues.y === COUNT_FIELD ? count() : formValues.y,
    tip: true,
  };
  const args = [from(tableName)];
  switch (formValues.chartType) {
    case "grouped-column":
      markValues.fill = "steelblue";
      chart = plot(...defaultValues, barY(...args, markValues));
      break;
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
