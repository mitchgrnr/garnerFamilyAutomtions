import { WebHookFunction } from "./function";
import { Payload } from "./payload";

export const webHookDefinition = {
  name: "finTxCreate",
  title: "Financial Transaction Created",
  description: "Webhook triggered when a new financial transaction page is created.  Maps budget categories to the incoming transaction categories.",
  expectedPayload: Payload,
  webHookFunction: WebHookFunction,
};

