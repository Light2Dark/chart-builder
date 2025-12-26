import type { Coordinator, DuckDBWASMConnector } from "@uwdata/mosaic-core";
import { assertNever } from "../utils/asserts";
import { Logger, logNever } from "@/utils/logger";
import { loadCSV, loadParquet, loadJSON, loadObjects } from "@uwdata/vgplot";
import type { CreateTableOptions } from "node_modules/@uwdata/mosaic-sql/dist/src/load/create";
import {
  BracketsIcon,
  CalendarClockIcon,
  CalendarIcon,
  CircleOffIcon,
  ClockIcon,
  CurlyBraces,
  HashIcon,
  ToggleLeft,
  TypeIcon,
  type LucideIcon,
} from "lucide-react";

const SAMPLE_VALUES_SIZE = 5;

export const DATASETS = ["Seattle Weather", "Stock Prices", "Pokemon"] as const;
export type Dataset = (typeof DATASETS)[number];

export function getDatasetUrl(dataset: Dataset) {
  switch (dataset) {
    case "Seattle Weather":
      return "https://raw.githubusercontent.com/uwdata/mosaic/901e0da302bb3a009d463c959f09ddb17049ecc0/data/seattle-weather.csv";
    case "Stock Prices":
      return "https://raw.githubusercontent.com/uwdata/mosaic/901e0da302bb3a009d463c959f09ddb17049ecc0/data/stocks.csv";
    case "Pokemon":
      return "https://gist.githubusercontent.com/armgilles/194bcff35001e7eb53a2a8b441e8b2c6/raw/92200bc0a673d5ce2110aaad4544ed6c4010f687/pokemon.csv";
    default:
      assertNever(dataset);
  }
}

interface ColumnSummary {
  dataType: DataType;
  nullable: boolean;
  sampleValues: unknown[];
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  defaultValue?: string;
  isUnique?: boolean;
  comment?: string;
}

export interface TableSummary {
  name: string;
  numRows?: number;
  columns: Map<string, ColumnSummary>;
}

export async function queryTable(
  duckdb: DuckDBWASMConnector,
  tableName: string,
  sampleValuesSize = SAMPLE_VALUES_SIZE,
): Promise<TableSummary | null> {
  try {
    /** Describe query result:
     * 0: "column_name"
     * 1: "column_type"
     * 2: "null"
     * 3: "key"
     * 4: "default". Default value of the column.
     * 5: "extra". Extra information about the column.
     */
    const describe = await duckdb.query({
      type: "arrow",
      sql: `DESCRIBE "${tableName}"`,
    });

    const sampleValues = await duckdb.query({
      type: "arrow",
      sql: `SELECT * FROM "${tableName}" USING SAMPLE ${sampleValuesSize}`,
    });

    const columns = describe
      .toArray()
      .reduce<Map<string, ColumnSummary>>((acc, row) => {
        acc.set(row.column_name, {
          dataType: String(row.column_type).toLowerCase() as DataType,
          sampleValues: sampleValues.toColumns()[row.column_name] as unknown[],
          nullable: isNullable(row.null),
          isPrimaryKey: isPrimaryKey(row.key),
          isForeignKey: isForeignKey(row.key),
          defaultValue: row.default,
          comment: row.extra ? String(row.extra) : undefined,
        });
        return acc;
      }, new Map());
    const tableSummary: TableSummary = {
      name: tableName,
      columns,
    };
    return tableSummary;
  } catch (error) {
    Logger.error("Error querying table", error);
    return null;
  }
}

/**
 * Load a table into mosaic
 * @param coordinator - The coordinator instance.
 * @param duckdb - The DuckDB instance.
 * @param data - The data to load.
 * @param tableName - The name of the table to load.
 */
export async function loadTable(
  coordinator: Coordinator,
  duckdb: DuckDBWASMConnector,
  data: { file: File } | { url: string } | { data: Record<string, unknown>[] },
  tableName: string,
) {
  const options: CreateTableOptions = {
    replace: true,
  };

  if ("data" in data) {
    coordinator.exec([
      loadObjects(tableName, data.data, options as Record<string, unknown>),
    ]);
    return;
  }

  const fileName = "file" in data ? data.file.name : data.url;
  const fileExtension = fileName.split(".").at(-1);
  const fileNameToLoad =
    "file" in data ? `uploaded_${data.file.name}` : data.url;

  if ("file" in data) {
    const duckdbInstance = await duckdb.getDuckDB();
    const fileBuffer = await data.file.arrayBuffer();
    duckdbInstance.registerFileBuffer(
      fileNameToLoad,
      new Uint8Array(fileBuffer),
    );
    return;
  }

  switch (fileExtension) {
    case "csv":
      coordinator.exec([
        loadCSV(
          `"${tableName}"`,
          fileNameToLoad,
          options as Record<string, unknown>,
        ),
      ]);
      break;
    case "parquet":
      coordinator.exec([
        loadParquet(
          `"${tableName}"`,
          fileNameToLoad,
          options as Record<string, unknown>,
        ),
      ]);
      break;
    case "json":
      coordinator.exec([
        loadJSON(
          `"${tableName}"`,
          fileNameToLoad,
          options as Record<string, unknown>,
        ),
      ]);
      break;
    default:
      throw new Error(`Unsupported file extension: ${fileExtension}`);
  }
}

/** Utility functions to parse DESCRIBE result, see https://duckdb.org/docs/stable/guides/meta/describe */
function isNullable(value: unknown): boolean {
  if (typeof value === "string" && value.toLowerCase() === "null") {
    return true;
  }
  if (value === null || value === undefined) {
    return true;
  }
  return false;
}

function isPrimaryKey(value: unknown): boolean {
  if (typeof value === "string" && value.toLowerCase().includes("pri")) {
    return true;
  }
  return false;
}

function isForeignKey(value: unknown): boolean {
  if (typeof value === "string" && value.toLowerCase().includes("for")) {
    return true;
  }
  return false;
}

/** Taken from codemirror-sql. Run SELECT * FROM DUCKDB_TYPES() to see all types.
 * https://github.com/marimo-team/codemirror-sql/blob/caa7c664135988b634f55a3e57a1327a5ffeede2/src/dialects/duckdb/duckdb.ts
 */
type DuckDBTypes =
  | "json" // originally "JSON"
  | "bigint"
  | "binary"
  | "bit"
  | "bitstring"
  | "blob"
  | "bool"
  | "boolean"
  | "bpchar"
  | "bytea"
  | "char"
  | "date"
  | "datetime"
  | "dec"
  | "decimal"
  | "double"
  | "enum"
  | "float"
  | "float4"
  | "float8"
  | "guid"
  | "hugeint"
  | "int"
  | "int1"
  | "int128"
  | "int16"
  | "int2"
  | "int32"
  | "int4"
  | "int64"
  | "int8"
  | "integer"
  | "integral"
  | "interval"
  | "list"
  | "logical"
  | "long"
  | "map"
  | "null"
  | "numeric"
  | "nvarchar"
  | "oid"
  | "real"
  | "row"
  | "short"
  | "signed"
  | "smallint"
  | "string"
  | "struct"
  | "text"
  | "time"
  | "timestamp"
  | "timestamp_ms"
  | "timestamp_ns"
  | "timestamp_s"
  | "timestamp_us"
  | "timestamptz"
  | "timetz"
  | "tinyint"
  | "ubigint"
  | "uhugeint"
  | "uint128"
  | "uint16"
  | "uint32"
  | "uint64"
  | "uint8"
  | "uinteger"
  | "union"
  | "usmallint"
  | "utinyint"
  | "uuid"
  | "varbinary"
  | "varchar"
  | "varint";

/** We add "unknown" in case the type is not in the list */
export type DataType = DuckDBTypes | "unknown";

export function getDataTypeMetadata(dataType: DataType): {
  Icon: LucideIcon;
  color: string;
} {
  switch (dataType) {
    case "string":
    case "varchar":
    case "char":
    case "bpchar":
    case "nvarchar":
    case "uuid":
    case "text":
    case "oid":
      return { Icon: TypeIcon, color: "bg-blue-200" };
    case "float":
    case "float4":
    case "float8":
    case "double":
    case "decimal":
    case "numeric":
    case "real":
    case "bigint":
    case "int128":
    case "int16":
    case "int2":
    case "int32":
    case "int4":
    case "int64":
    case "int8":
    case "integer":
    case "integral":
    case "int":
    case "int1":
    case "uint128":
    case "uint16":
    case "uint32":
    case "uint64":
    case "uint8":
    case "tinyint":
    case "ubigint":
    case "uhugeint":
    case "uinteger":
    case "usmallint":
    case "utinyint":
    case "varint":
    case "hugeint":
    case "long":
    case "smallint":
    case "signed":
    case "short":
      return { Icon: HashIcon, color: "bg-purple-200" };
    case "boolean":
    case "bool":
    case "logical":
      return { Icon: ToggleLeft, color: "bg-orange-200" };
    case "date":
      return { Icon: CalendarIcon, color: "bg-green-100" };
    case "datetime":
      return { Icon: CalendarClockIcon, color: "bg-green-100" };
    case "time":
    case "timestamp":
    case "timestamp_ms":
    case "timestamp_ns":
    case "timestamp_s":
    case "timestamp_us":
    case "timestamptz":
    case "timetz":
      return { Icon: ClockIcon, color: "bg-green-100" };
    case "list":
    case "union":
    case "enum":
      return { Icon: BracketsIcon, color: "bg-slate-400" };
    case "json":
    case "binary":
    case "varbinary":
    case "bit":
    case "bitstring":
    case "blob":
    case "bytea":
    case "dec":
    case "guid":
    case "interval":
    case "map":
    case "row":
    case "struct":
    case "unknown":
      return { Icon: CurlyBraces, color: "bg-slate-400" };
    case "null":
      return { Icon: CircleOffIcon, color: "bg-slate-400" };
    default:
      logNever(dataType);
      return { Icon: CurlyBraces, color: "bg-slate-400" };
  }
}

export function getSimplifiedDataType(
  dataType: DataType,
): "temporal" | "quantitative" | "ordinal" | "nominal" | "unknown" {
  switch (dataType) {
    case "string":
    case "varchar":
    case "char":
    case "bpchar":
    case "nvarchar":
    case "uuid":
    case "text":
    case "oid":
      return "nominal";
    case "float":
    case "float4":
    case "float8":
    case "double":
    case "decimal":
    case "numeric":
    case "real":
    case "bigint":
    case "int128":
    case "int16":
    case "int2":
    case "int32":
    case "int4":
    case "int64":
    case "int8":
    case "integer":
    case "integral":
    case "int":
    case "int1":
    case "uint128":
    case "uint16":
    case "uint32":
    case "uint64":
    case "uint8":
    case "tinyint":
    case "ubigint":
    case "uhugeint":
    case "uinteger":
    case "usmallint":
    case "utinyint":
    case "varint":
    case "hugeint":
    case "long":
    case "smallint":
    case "signed":
    case "short":
      return "quantitative";
    case "boolean":
    case "bool":
    case "logical":
      return "ordinal";
    case "date":
    case "datetime":
    case "time":
    case "timestamp":
    case "timestamp_ms":
    case "timestamp_ns":
    case "timestamp_s":
    case "timestamp_us":
    case "timestamptz":
    case "timetz":
      return "temporal";
    case "json":
    case "binary":
    case "varbinary":
    case "bit":
    case "bitstring":
    case "blob":
    case "bytea":
    case "dec":
    case "guid":
    case "interval":
    case "map":
    case "row":
    case "struct":
    case "unknown":
    case "list":
    case "union":
    case "enum":
    case "null":
      return "unknown";
    default:
      logNever(dataType);
      return "unknown";
  }
}
