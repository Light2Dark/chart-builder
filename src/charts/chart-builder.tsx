import { useEffect, useRef, useState } from "react";
import * as vg from "@uwdata/vgplot";
import type { Coordinator } from "@uwdata/mosaic-core";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DATASETS,
  DatasetToTableName,
  getDatasetUrl,
  queryTable,
  type Dataset,
} from "./data";
import {
  createFormHook,
  createFormHookContexts,
  formOptions,
  useStore,
} from "@tanstack/react-form";
import { z } from "zod";
import { BarChart, ChartPie, LineChart } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { defaultChartForm, type ChartForm, type ChartType } from "./types";
import { Logger, logNever } from "@/utils/logger";

const { fieldContext, formContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
  formComponents: {},
  fieldComponents: { Select },
  fieldContext,
  formContext,
});

const NULL_VALUE = "";

export const ChartBuilder = ({
  coordinator,
  duckdb,
}: {
  coordinator: Coordinator;
  duckdb: vg.DuckDBWASMConnector;
}) => {
  const [datasetSelected, setDatasetSelected] = useState<Dataset | null>(null);

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
  });

  const handleDatasetSelected = (value: string) => {
    const dataset = value as Dataset;
    setDatasetSelected(dataset);

    if (dataset === "Seattle Weather") {
      const datasetUrl = getDatasetUrl(dataset);
      const tableName = DatasetToTableName[dataset];
      coordinator.exec([vg.loadCSV(tableName, datasetUrl)]);
      queryTable(duckdb, tableName).then((result) => {
        Logger.info("Result", result);
      });
    }
  };

  const formValues = useStore(form.store);

  const sampleColumns = [
    "date",
    "precipitation",
    "temp_max",
    "temp_min",
    "wind",
    "weather",
  ];

  const formComponent = (
    <div className="flex flex-row gap-2">
      <form
        className="border-r px-2 w-64 text-xs"
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <form.AppField
          name="chartType"
          children={(field) => (
            <Select
              name="chartType"
              onValueChange={(value) => field.handleChange(value as ChartType)}
              defaultValue={defaultChartForm.chartType}
            >
              <SelectTrigger
                size="sm"
                className="border-0 h-6! rounded-none w-full text-xs! ring-0 shadow-none"
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
        <Tabs defaultValue="data" className="mt-2">
          <TabsList className="h-7.5 w-full text-xs">
            <TabsTrigger value="data">Data</TabsTrigger>
            <TabsTrigger value="style">Style</TabsTrigger>
          </TabsList>
          <TabsContent value="data" className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <h2>X axis</h2>
              <form.AppField
                name="x"
                children={(field) => (
                  <Select
                    name="x"
                    value={
                      field.state.value ?? defaultChartForm.x ?? NULL_VALUE
                    }
                    onValueChange={(value) => field.handleChange(value)}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full text-xs h-7! shadow-xs"
                    >
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent className="**:text-xs!">
                      {sampleColumns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1">
              <h2>Y axis</h2>
              <form.AppField
                name="y"
                children={(field) => (
                  <Select
                    name="y"
                    onValueChange={(value) => field.handleChange(value)}
                    value={
                      field.state.value ?? defaultChartForm.y ?? NULL_VALUE
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-full text-xs h-7! shadow-xs"
                    >
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent className="**:text-xs!">
                      {sampleColumns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </TabsContent>
          <TabsContent value="style">Styling the chart</TabsContent>
        </Tabs>
      </form>
      {datasetSelected && (
        <div className="px-2 w-[750px]">
          <Chart dataset={datasetSelected} formValues={formValues.values} />
        </div>
      )}
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

const Chart = ({
  dataset,
  formValues,
}: {
  dataset: Dataset;
  formValues: ChartForm;
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isXAndYDefined = formValues.x && formValues.y;

  useEffect(() => {
    let chart: HTMLElement | null = null;

    if (!formValues.x || !formValues.y) {
      return;
    }

    if (dataset === "Seattle Weather") {
      try {
        const tableName = DatasetToTableName[dataset];
        const args = [vg.from(tableName), { x: formValues.x, y: formValues.y }];
        switch (formValues.chartType) {
          case "bar":
            chart = vg.plot(vg.barY(...args));
            break;
          case "line":
            chart = vg.plot(vg.lineY(...args));
            break;
          default:
            logNever(formValues.chartType);
        }
      } catch (error) {
        Logger.error("Error rendering chart", error);
      }
    }

    if (chartContainerRef.current && chart) {
      chartContainerRef.current.innerHTML = "";
      chartContainerRef.current.appendChild(chart);
    }

    return () => {
      chart?.remove();
    };
  }, [dataset, formValues.chartType, formValues.x, formValues.y]);

  if (!isXAndYDefined) {
    return <EmptyChart message="Please select an X and Y axis" />;
  }

  return <div ref={chartContainerRef} />;
};

const EmptyChart = ({ message }: { message: string }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2 h-64">
      <ChartPie className="size-28" strokeWidth={1.5} />
      {message}
    </div>
  );
};
