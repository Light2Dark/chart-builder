import { AlertCircle, Database } from "lucide-react";

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
