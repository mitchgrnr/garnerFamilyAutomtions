import { finTxCreateWebhookSchema } from "./webhookSchema";

export const webHookDefinition = {
  name: "finTxCreate",
  title: "Financial Transaction Created",
  description: "Webhook triggered when a new financial transaction page is created.  Maps budget categories to the incoming transaction categories.",
  inputSchema: finTxCreateWebhookSchema,
};

