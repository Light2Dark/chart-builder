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
  getDatasetUrl,
  loadTable,
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
import { Logger } from "@/utils/logger";
import { useQuery } from "@tanstack/react-query";
import { assertNever } from "@/utils/asserts";
import { Spinner } from "@/components/ui/spinner";
import { FieldTitle } from "./components";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button/button";
import { Textarea } from "@/components/ui/textarea";

const { fieldContext, formContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
  formComponents: {},
  fieldComponents: { Select },
  fieldContext,
  formContext,
});

const NULL_VALUE = "";
const SUPPORTED_FILE_FORMATS = ".csv,.json,.parquet";

export const ChartBuilder = ({
  coordinator,
  duckdb,
}: {
  coordinator: Coordinator;
  duckdb: vg.DuckDBWASMConnector;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [datasetSelected, setDatasetSelected] = useState<Dataset | null>(null);
  const [displayManualInput, setDisplayManualInput] = useState(false);
  const [manualInput, setManualInput] = useState<string>("");

  // Prioritize manual input, then uploaded file, then dataset.
  const hasManualInput = displayManualInput && manualInput.trim() !== "";
  let tableName = null;
  if (hasManualInput) {
    tableName = "manual_data";
  } else if (uploadedFile) {
    tableName = formatTableName(uploadedFile.name);
  } else if (datasetSelected) {
    tableName = formatTableName(datasetSelected);
  }

  const formOpts = formOptions({
    defaultValues: defaultChartForm,
    validators: {
      onChange: z.object({
        chartType: z.enum(["line", "bar"]),
        x: z.string().nullable(),
        y: z.string().nullable(),
        colorBy: z.string().nullable(),
      }),
    },
  });
  const form = useAppForm({
    ...formOpts,
  });

  const { isPending, error, data } = useQuery({
    queryKey: ["dataset", tableName],
    queryFn: async ({ queryKey }) => {
      const tableName = queryKey[1] as string | null;
      if (!tableName) {
        return null;
      }
      if (hasManualInput) {
        await loadTable(
          coordinator,
          duckdb,
          { data: JSON.parse(manualInput) },
          tableName,
        );
        return await queryTable(duckdb, tableName);
      } else if (uploadedFile) {
        await loadTable(coordinator, duckdb, { file: uploadedFile }, tableName);
        return await queryTable(duckdb, tableName);
      } else if (datasetSelected) {
        const datasetUrl = getDatasetUrl(datasetSelected);
        await loadTable(coordinator, duckdb, { url: datasetUrl }, tableName);
        return await queryTable(duckdb, tableName);
      } else {
        return null;
      }
    },
    staleTime: Infinity,
    enabled: !!tableName,
  });

  const handleDatasetSelected = (value: string) => {
    const dataset = value as Dataset;
    setDatasetSelected(dataset);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleFileClear = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formValues = useStore(form.store);
  const sampleColumns = data?.columns ? Object.keys(data.columns) : [];

  const renderFormBuilder = () => {
    if (isPending) {
      return (
        <div className="flex flex-row items-center gap-2 justify-center h-full">
          <Spinner size={24} />
          <p className="text-lg">Loading...</p>
        </div>
      );
    }
    if (error) {
      return <div>Error: {error.message}</div>;
    }
    if (!data) {
      return <div>No data</div>;
    }
    return (
      <form
        className="text-xs"
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
              <FieldTitle name="X axis" />
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
              <FieldTitle name="Y axis" />
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
            <div className="flex flex-col gap-1">
              <FieldTitle name="Color by" />
              <form.AppField
                name="colorBy"
                children={(field) => (
                  <Select
                    name="colorBy"
                    value={
                      field.state.value ??
                      defaultChartForm.colorBy ??
                      NULL_VALUE
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
          </TabsContent>
          <TabsContent value="style">Styling (not yet supported)</TabsContent>
        </Tabs>
      </form>
    );
  };

  const showSelectDataset = !uploadedFile && !displayManualInput;
  const showUploadFile = !displayManualInput;
  const showEnterDataManually = displayManualInput;

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="flex flex-row gap-2 items-center">
        {showSelectDataset && (
          <>
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
            <p className="text-muted-foreground">or</p>
          </>
        )}
        {showUploadFile && (
          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground min-w-32"
            >
              {uploadedFile ? `Uploaded ${uploadedFile.name}` : "Upload a file"}
            </Button>
            {uploadedFile && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-1 h-6 px-2 text-muted-foreground"
                onClick={handleFileClear}
              >
                Clear
              </Button>
            )}
            <Input
              type="file"
              className="hidden"
              accept={SUPPORTED_FILE_FORMATS}
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </div>
        )}

        {!showEnterDataManually && (
          <>
            <p className="text-muted-foreground">or</p>
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground min-w-32"
              onClick={() => setDisplayManualInput(!displayManualInput)}
            >
              Enter data manually
            </Button>
          </>
        )}
        {showEnterDataManually && (
          <>
            <Textarea
              placeholder="Enter array of objects (e.g. [{x: 1, y: 2}, {x: 2, y: 3}])"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
            />
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => {
                setManualInput("");
                setDisplayManualInput(false);
              }}
            >
              Clear
            </Button>
          </>
        )}
      </div>

      {tableName && (
        <div className="flex flex-row gap-2">
          <div className="border-r px-2 w-64">{renderFormBuilder()}</div>
          <div className="px-2 w-[750px]">
            <Chart tableName={tableName} formValues={formValues.values} />
          </div>
        </div>
      )}
    </div>
  );
};

const Chart = ({
  tableName,
  formValues,
}: {
  tableName: string;
  formValues: ChartForm;
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const isXAndYDefined = formValues.x && formValues.y;

  useEffect(() => {
    let chart: HTMLElement | null = null;

    if (!formValues.x || !formValues.y) {
      return;
    }

    try {
      const axisValues: Record<string, unknown> = {
        x: formValues.x,
        y: formValues.y,
      };
      const args = [vg.from(tableName)];
      switch (formValues.chartType) {
        case "bar":
          axisValues.fill = "steelblue";
          chart = vg.plot(vg.barY(...args, axisValues));
          break;
        case "line":
          chart = vg.plot(vg.lineY(...args, axisValues));
          break;
        default:
          assertNever(formValues.chartType);
      }
    } catch (error) {
      Logger.error("Error rendering chart", error);
    }

    if (chartContainerRef.current && chart) {
      chartContainerRef.current.innerHTML = "";
      chartContainerRef.current.appendChild(chart);
    }

    return () => {
      chart?.remove();
    };
  }, [tableName, formValues]);

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

function formatTableName(fileName: string) {
  // Remove any file extension and replace spaces with underscores
  return fileName.split(".")[0].split(" ").join("_");
}
