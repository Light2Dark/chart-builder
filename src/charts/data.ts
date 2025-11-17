import type { Coordinator, DuckDBWASMConnector } from "@uwdata/mosaic-core";
import { assertNever } from "../utils/asserts";
import { Logger } from "@/utils/logger";
import { loadCSV, loadParquet, loadJSON, loadObjects } from "@uwdata/vgplot";

const SAMPLE_VALUES_SIZE = 5;

export const DATASETS = ["Seattle Weather", "Stock Prices"] as const;
export type Dataset = (typeof DATASETS)[number];

export function getDatasetUrl(dataset: Dataset) {
  switch (dataset) {
    case "Seattle Weather":
      return "https://raw.githubusercontent.com/uwdata/mosaic/901e0da302bb3a009d463c959f09ddb17049ecc0/data/seattle-weather.csv";
    case "Stock Prices":
      return "https://raw.githubusercontent.com/uwdata/mosaic/901e0da302bb3a009d463c959f09ddb17049ecc0/data/stocks.csv";
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

interface TableSummary {
  name: string;
  numRows?: number;
  columns: Record<string, ColumnSummary>;
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

    const columns: Record<string, ColumnSummary> = describe
      .toArray()
      .reduce((acc, row) => {
        acc[row.column_name] = {
          dataType: String(row.column_type).toLowerCase() as DataType,
          sampleValues: sampleValues.toColumns()[row.column_name] as unknown[],
          nullable: isNullable(row.null),
          isPrimaryKey: isPrimaryKey(row.key),
          isForeignKey: isForeignKey(row.key),
          defaultValue: row.default,
          comment: row.extra ? String(row.extra) : undefined,
        };
        return acc;
      }, {});
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
  if ("data" in data) {
    loadObjects(tableName, data.data);
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
  }

  switch (fileExtension) {
    case "csv":
      coordinator.exec([loadCSV(`"${tableName}"`, fileNameToLoad)]);
      break;
    case "parquet":
      coordinator.exec([loadParquet(`"${tableName}"`, fileNameToLoad)]);
      break;
    case "json":
      coordinator.exec([loadJSON(`"${tableName}"`, fileNameToLoad)]);
      break;
    default:
      throw new Error(`Unsupported file extension: ${fileExtension}`);
  }
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
