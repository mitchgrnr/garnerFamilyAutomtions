import SyncFunction from "./function";

export const SyncDefinition = {
  name: "syncTransactionCategories",
  schedule: "manual" as const,
  execute: SyncFunction,
};
