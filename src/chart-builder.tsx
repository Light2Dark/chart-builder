import { useEffect, useRef, useState } from "react";
import * as vg from "@uwdata/vgplot";
import type { Coordinator } from "@uwdata/mosaic-core";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { DATASETS, getDatasetUrl, type Dataset } from "./data";
import {
  createFormHook,
  createFormHookContexts,
  formOptions,
} from "@tanstack/react-form";
import { z } from "zod";
import { SubmitButton } from "./components/ui/button/button";
import { BarChart, LineChart } from "lucide-react";

interface ChartForm {
  chartType: "line" | "bar";
  x: string | null;
  y: string | null;
}

const defaultChartForm: ChartForm = {
  chartType: "line",
  x: null,
  y: null,
};

const { fieldContext, formContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
  formComponents: { SubmitButton },
  fieldComponents: {},
  fieldContext,
  formContext,
});

export const ChartBuilder = ({ coordinator }: { coordinator: Coordinator }) => {
  const [datasetSelected, setDatasetSelected] = useState<Dataset | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const formOpts = formOptions({
    defaultValues: defaultChartForm,
    validators: {
      onChange: z.object({
        chartType: z.enum(["line", "bar"]),
        x: z.string().nullable(),
        y: z.string().nullable(),
      }),
    },
  });
  const form = useAppForm({
    ...formOpts,
    onSubmit: async (value) => {
      console.log(value.value);
    },
  });

  useEffect(() => {
    if (!datasetSelected) {
      return;
    }

    let chart: HTMLDivElement | null = null;

    if (datasetSelected === "Seattle Weather") {
      const $click = vg.Selection.single();
      const $domain = vg.Param.array(["sun", "fog", "drizzle", "rain", "snow"]);
      const $colors = vg.Param.array([
        "#e7ba52",
        "#a7a7a7",
        "#aec7e8",
        "#1f77b4",
        "#9467bd",
      ]);
      const $range = vg.Selection.intersect();
      chart = vg.vconcat(
        vg.hconcat(
          vg.plot(
            vg.dot(vg.from("weather", { filterBy: $click }), {
              x: vg.dateMonthDay("date"),
              y: "temp_max",
              fill: "weather",
              r: "precipitation",
              fillOpacity: 0.7,
            }),
            vg.intervalX({
              as: $range,
              brush: { fill: "none", stroke: "#888" },
            }),
            vg.highlight({ by: $range, fill: "#ccc", fillOpacity: 0.2 }),
            vg.colorLegend({ as: $click, columns: 1 }),
            vg.xyDomain(vg.Fixed),
            vg.xTickFormat("%b"),
            vg.colorDomain($domain),
            vg.colorRange($colors),
            vg.rDomain(vg.Fixed),
            vg.rRange([2, 10]),
            vg.width(680),
            vg.height(300),
          ),
        ),
        vg.plot(
          vg.barX(vg.from("weather"), {
            x: vg.count(),
            y: "weather",
            fill: "#ccc",
            fillOpacity: 0.2,
          }),
          vg.barX(vg.from("weather", { filterBy: $range }), {
            x: vg.count(),
            y: "weather",
            fill: "weather",
          }),
          vg.toggleY({ as: $click }),
          vg.highlight({ by: $click }),
          vg.xDomain(vg.Fixed),
          vg.yDomain($domain),
          vg.yLabel(null),
          vg.colorDomain($domain),
          vg.colorRange($colors),
          vg.width(680),
        ),
      );
    }

    if (chartContainerRef.current && chart) {
      chartContainerRef.current.innerHTML = "";
      chartContainerRef.current.appendChild(chart);
    }

    return () => {
      chart?.remove();
    };
  }, [datasetSelected]);

  const handleDatasetSelected = (value: string) => {
    const dataset = value as Dataset;
    setDatasetSelected(dataset);

    if (dataset === "Seattle Weather") {
      const datasetUrl = getDatasetUrl(dataset);
      coordinator.exec([vg.loadCSV("weather", datasetUrl)]);
    }
  };

  const formComponent = (
    <div className="flex flex-row gap-2">
      <form className="border-r px-2 w-64">
        <form.AppField
          name="chartType"
          children={() => (
            <Select>
              <SelectTrigger
                size="sm"
                className="border-0 h-6! rounded-none w-48 text-xs! ring-0 shadow-none"
              >
                <SelectValue placeholder="Chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line" className="text-xs!">
                  <LineChart className="size-4" />
                  Line
                </SelectItem>
                <SelectItem value="bar" className="text-xs!">
                  <BarChart className="size-4" />
                  Bar
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </form>
      <div className="px-2" ref={chartContainerRef} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4 items-center">
      <Select onValueChange={handleDatasetSelected}>
        <SelectTrigger size="sm">
          <SelectValue placeholder="Select a dataset" />
        </SelectTrigger>
        <SelectContent>
          {DATASETS.map((dataset) => (
            <SelectItem key={dataset} value={dataset}>
              {dataset}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {datasetSelected && formComponent}
    </div>
  );
};
