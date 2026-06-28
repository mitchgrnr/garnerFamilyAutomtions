import { Worker } from "@notionhq/workers";
import * as Schema from "@notionhq/workers/schema";
import { FinTxCreateWebHook } from "./worker-definitions/webhooks/finTxCreate";
import { SetTransactionCategoryMapping } from "./worker-definitions/tools/setTransactionCategoryMapping";
import { SyncTransactionCategories } from "./worker-definitions/syncs/syncTransactionCategories";
import { SyncTransactionNames } from "./worker-definitions/syncs/syncTransactionNames";

const worker = new Worker();
export default worker;

const process = (globalThis as any).process;

// Webhooks
worker.webhook(FinTxCreateWebHook.name, {
  title: FinTxCreateWebHook.title,
  description: FinTxCreateWebHook.description,
  execute: async (events, { notion }) => {
    for (const event of events) {
      try {
        const payload = FinTxCreateWebHook.expectedPayload.fromBody(event.body);
        await FinTxCreateWebHook.webHookFunction({ payload }, { notion }, { process });
      } catch (error) {
        console.error("Error processing finTxCreate webhook:", error);
      }
    }
  },
});

// Tools
worker.tool(SetTransactionCategoryMapping.name, {
  title: SetTransactionCategoryMapping.title,
  description: SetTransactionCategoryMapping.description,
  schema: SetTransactionCategoryMapping.schema,
  outputSchema: SetTransactionCategoryMapping.outputSchema,
  execute: async (input, { notion }) => {
    return SetTransactionCategoryMapping.toolFunction({ input }, { notion }, { process });
  },
});

// Shared Sync Status Database
const syncs = worker.database("syncs", {
  type: "managed",
  initialTitle: "Syncs",
  primaryKeyProperty: "Sync ID",
  schema: {
    properties: {
      Name: Schema.title(),
      "Sync ID": Schema.richText(),
      State: Schema.richText(),
    },
  },
});

// Syncs
worker.sync(SyncTransactionCategories.name, {
  database: syncs,
  schedule: SyncTransactionCategories.schedule,
  execute: (state, context) => SyncTransactionCategories.execute(state, context),
});

worker.sync(SyncTransactionNames.name, {
  database: syncs,
  schedule: SyncTransactionNames.schedule,
  execute: (state, context) => SyncTransactionNames.execute(state, context),
});
