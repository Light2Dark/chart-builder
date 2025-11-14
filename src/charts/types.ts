export type ChartType = "line" | "bar";

export interface ChartForm {
  chartType: ChartType;
  x: string | null;
  y: string | null;
  colorBy: string | null;
}

export const defaultChartForm: ChartForm = {
  chartType: "line",
  x: null,
  y: null,
  colorBy: null,
};
