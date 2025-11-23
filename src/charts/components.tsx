import { Button } from "@/components/ui/button/button";
import { SelectItem } from "@/components/ui/select";
import { AlertCircle, Database } from "lucide-react";
import type { ChartType } from "./types";
import groupedColumnImage from "@/assets/charts/grouped_column.svg";
import lineImage from "@/assets/charts/line.svg";
import groupedHundredImage from "@/assets/charts/grouped_100_column.svg";
import stackedColumnImage from "@/assets/charts/stacked_column.svg";
import { getDataTypeMetadata, type DataType } from "./data";
import { cn } from "@/lib/utils";

export const FieldTitle = ({ name }: { name: string }) => {
  return <h2 className="font-medium">{name}</h2>;
};

export const ErrorState = ({ message }: { message: string }) => {
  return (
    <div className="flex flex-col items-center gap-1 justify-center h-full">
      <AlertCircle size={48} className="text-destructive" strokeWidth={1.5} />
      <div className="flex flex-col items-center gap-1">
        <p className="text-lg font-medium text-destructive">Error</p>
        <p className="text-sm text-muted-foreground break-all">{message}</p>
      </div>
    </div>
  );
};

export const NoDataState = () => {
  return (
    <div className="flex flex-col items-center gap-1 justify-center h-full text-muted-foreground">
      <Database size={48} strokeWidth={1.5} />
      <p className="text-lg">No data available</p>
    </div>
  );
};

export const ClearButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <Button variant="ghost" className="text-muted-foreground" onClick={onClick}>
      Clear
    </Button>
  );
};

const ImageToPathMap: Record<ChartType, string> = {
  "grouped-column": groupedColumnImage,
  "stacked-column": stackedColumnImage,
  "100-stacked-column": groupedHundredImage,
  line: lineImage,
  bar: stackedColumnImage, // TODO: Add bar image
};

const LabelToChartTypeMap: Record<ChartType, string> = {
  "grouped-column": "Grouped Column",
  "stacked-column": "Stacked Column",
  "100-stacked-column": "100% Stacked Column",
  line: "Line",
  bar: "Bar",
};

export const ChartTypeSelectValue = ({
  value,
}: {
  value: ChartType | null | undefined;
}) => {
  if (!value) return null;
  const imageUrl = ImageToPathMap[value];
  const label = LabelToChartTypeMap[value];
  return (
    <div className="flex items-center gap-2">
      <img src={imageUrl} alt={label} className="h-5 w-5" />
      <span>{label}</span>
    </div>
  );
};

export const ChartTypeItem = ({
  value,
  ...props
}: {
  value: ChartType;
} & React.ComponentProps<typeof SelectItem>) => {
  const imageUrl = ImageToPathMap[value];
  const label = LabelToChartTypeMap[value];
  return (
    <SelectItem
      value={value}
      className="border-2 rounded-md h-24 w-1/3 flex-col items-center justify-center text-xs! 
      focus:bg-transparent cursor-pointer focus:border-primary/70"
      {...props}
    >
      {/* Small margin added to offset the tick when item is selected */}
      <img src={imageUrl} alt={label} className="ml-2" />
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-popover hover:bg-popover/80 whitespace-nowrap">
        {label}
      </span>
    </SelectItem>
  );
};

export const ColumnSelectItem = ({
  column,
  label,
  dataType,
}: {
  column: string;
  label?: string;
  dataType: DataType;
}) => {
  const { Icon, color } = getDataTypeMetadata(dataType);
  return (
    <SelectItem value={column}>
      <Icon
        className={cn("size-4 p-0.5 rounded-[3px]", color)}
        stroke={"black"}
        strokeOpacity={0.8}
        strokeWidth={2}
      />
      {label ?? column}
    </SelectItem>
  );
};
