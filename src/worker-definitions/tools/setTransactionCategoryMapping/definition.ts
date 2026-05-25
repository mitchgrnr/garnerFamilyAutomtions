import ToolFunction from "./function";
import InputModel from "./input";
import OutputModel from "./output";

export const ToolDefinition = {
  name: "setTransactionCategoryMapping",
  title: "Set Transaction Category Mapping",
  description: "Tool to set the category mapping for a financial transaction page.",
  schema: InputModel,
  outputSchema: OutputModel,
  toolFunction: ToolFunction,
};