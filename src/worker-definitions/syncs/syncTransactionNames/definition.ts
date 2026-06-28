import SyncFunction from "./function";

export const SyncDefinition = {
  name: "syncTransactionNames",
  schedule: "manual" as const,
  execute: SyncFunction,
};
