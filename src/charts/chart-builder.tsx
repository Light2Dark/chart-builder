import { useEffect, useRef, useState } from "react";
import type { DuckDBWASMConnector } from "@uwdata/mosaic-core";
import type { Coordinator } from "@uwdata/mosaic-core";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
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
import { ChartPie } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { defaultChartForm, type ChartForm, type ChartType } from "./types";
import { Logger } from "@/utils/logger";
import { useQuery } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/spinner";
import {
  ChartTypeItem,
  ChartTypeSelectValue,
  ClearButton,
  ColumnSelectItem,
  ErrorState,
  FieldTitle,
  NoDataState,
} from "./components";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { COUNT_FIELD, NULL_VALUE, specChart } from "./spec";
import { cn } from "@/lib/utils";

const { fieldContext, formContext } = createFormHookContexts();

const { useAppForm } = createFormHook({
  formComponents: {},
  fieldComponents: { Select },
  fieldContext,
  formContext,
});

const SUPPORTED_FILE_FORMATS = ".csv,.json,.parquet";

export const ChartBuilder = ({
  coordinator,
  duckdb,
}: {
  coordinator: Coordinator;
  duckdb: DuckDBWASMConnector;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [datasetSelected, setDatasetSelected] = useState<Dataset | null>(null);
  const [displayExpandedManualInput, setDisplayExpandedManualInput] =
    useState(false);
  const [manualInput, setManualInput] = useState<string>("");
  const [remoteUrl, setRemoteUrl] = useState<string>("");

  // Prioritize remote URL, then manual input, then uploaded file, then dataset.
  const hasRemoteUrl = remoteUrl.trim() !== "";
  const hasManualInput =
    displayExpandedManualInput && manualInput.trim() !== "";
  let tableName = null;
  if (hasRemoteUrl) {
    tableName = formatTableName(remoteUrl);
  } else if (hasManualInput) {
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
    queryKey: ["dataset", tableName, manualInput, remoteUrl],
    queryFn: async ({ queryKey }) => {
      const tableName = queryKey[1] as string | null;
      if (!tableName) {
        return null;
      }
      if (hasRemoteUrl) {
        await loadTable(coordinator, duckdb, { url: remoteUrl }, tableName);
        return await queryTable(duckdb, tableName);
      } else if (hasManualInput) {
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
    retry: false,
  });

  const resetFormValues = () => {
    form.reset();
  };

  const handleDatasetSelected = (value: string) => {
    resetFormValues();
    const dataset = value as Dataset;
    setDatasetSelected(dataset);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    resetFormValues();
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const handleFileClear = () => {
    resetFormValues();
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formValues = useStore(form.store);
  const columns = data?.columns ? Object.keys(data.columns) : [];

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
      return <ErrorState message={error.message} />;
    }
    if (!data) {
      return <NoDataState />;
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
              value={field.state.value ?? defaultChartForm.chartType}
            >
              <SelectTrigger
                size="sm"
                className="h-6.5! w-full text-xs! border-none rounded-sm shadow-none hover:bg-muted transition-colors"
              >
                <SelectValue placeholder="Chart type">
                  <ChartTypeSelectValue value={field.state.value} />
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="p-3 text-xs w-md h-[450px]">
                <div className="flex flex-col gap-5">
                  <SelectGroup>
                    <SelectLabel className="font-bold text-muted-foreground">
                      COLUMN
                    </SelectLabel>
                    <div className="flex flex-row gap-2">
                      <ChartTypeItem value="grouped-column" />
                      <ChartTypeItem value="stacked-column" disabled />
                      <ChartTypeItem value="100-stacked-column" disabled />
                    </div>
                  </SelectGroup>

                  <SelectGroup>
                    <SelectLabel className="font-bold text-muted-foreground">
                      LINE & AREA
                    </SelectLabel>
                    <div className="flex flex-row gap-2">
                      <ChartTypeItem value="line" />
                    </div>
                  </SelectGroup>
                </div>
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
                      {columns.map((column) => (
                        <ColumnSelectItem
                          key={column}
                          column={column}
                          dataType={data.columns[column].dataType}
                        />
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
                      <ColumnSelectItem
                        column={COUNT_FIELD}
                        label="Count of Records"
                        dataType={"numeric"}
                      />
                      <SelectSeparator />
                      {columns.map((column) => (
                        <ColumnSelectItem
                          key={column}
                          column={column}
                          dataType={data.columns[column].dataType}
                        />
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {/* <div className="flex flex-col gap-1">
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
                      {columns.map((column) => (
                        <SelectItem key={column} value={column}>
                          {column}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div> */}
          </TabsContent>
          <TabsContent value="style">Styling (not yet supported)</TabsContent>
        </Tabs>
      </form>
    );
  };

  const showSelectDataset =
    !uploadedFile && !displayExpandedManualInput && !hasRemoteUrl;

  const showUploadFile =
    !datasetSelected && !displayExpandedManualInput && !hasRemoteUrl;

  const showManualInput = !datasetSelected && !uploadedFile && !hasRemoteUrl;
  const showExpandedManualInput = showManualInput && displayExpandedManualInput;

  const showRemoteDataset =
    !uploadedFile && !displayExpandedManualInput && !datasetSelected;

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="flex flex-row gap-2 items-center">
        {showSelectDataset && (
          <>
            <Select
              onValueChange={handleDatasetSelected}
              value={datasetSelected ?? NULL_VALUE}
            >
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
            {datasetSelected && (
              <ClearButton onClick={() => setDatasetSelected(null)} />
            )}
            {!datasetSelected && <p className="text-muted-foreground">or</p>}
          </>
        )}
        {showUploadFile && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-muted-foreground min-w-32"
            >
              {uploadedFile ? `Uploaded ${uploadedFile.name}` : "Upload a file"}
            </Button>
            {uploadedFile && <ClearButton onClick={handleFileClear} />}
            <Input
              type="file"
              className="hidden"
              accept={SUPPORTED_FILE_FORMATS}
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </>
        )}

        {showManualInput && !displayExpandedManualInput && (
          <>
            <p className="text-muted-foreground">or</p>
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground min-w-32"
              onClick={() =>
                setDisplayExpandedManualInput(!displayExpandedManualInput)
              }
            >
              Enter data manually
            </Button>
          </>
        )}
        {showExpandedManualInput && (
          <>
            <Textarea
              name="manualInput"
              placeholder="Enter array of objects (e.g. [{x: 1, y: 2}, {x: 2, y: 3}])"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="max-h-48 w-[400px] font-mono! text-xs!"
            />
            <ClearButton
              onClick={() => {
                setManualInput("");
                setDisplayExpandedManualInput(false);
              }}
            />
          </>
        )}
      </div>

      {showRemoteDataset && (
        <div className="flex flex-row gap-2">
          <Label htmlFor="remoteUrl">Remote dataset</Label>
          <Input
            id="remoteUrl"
            type="text"
            value={remoteUrl}
            onChange={(e) => setRemoteUrl(e.target.value)}
            className="w-96 text-sm!"
            placeholder="URL with .csv, .parquet, or .json"
            pattern="https?://.*\.(csv|parquet|json)"
          />
        </div>
      )}

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
      chart = specChart(formValues, tableName);
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
