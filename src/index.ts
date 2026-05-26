import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";
import * as Builder from "@notionhq/workers/builder";
import * as Schema from "@notionhq/workers/schema";
import { FinTxCreateWebHook } from "./worker-definitions/webhooks/finTxCreate";
import { SetTransactionCategoryMapping } from "./worker-definitions/tools/setTransactionCategoryMapping";
import { iteratePaginatedAPI } from "@notionhq/client";

const worker = new Worker();
export default worker;
/**Use process to access environment variables via process.env.{Environment variable name} */
const process = (globalThis as any).process;

worker.webhook(FinTxCreateWebHook.name, {
  title: FinTxCreateWebHook.title,
  description: FinTxCreateWebHook.description,
  execute: async (events, { notion }) => {
    for (const event of events) {
      try {
        const webhookBody = FinTxCreateWebHook.expectedPayload.fromBody(event.body);
        await FinTxCreateWebHook.webHookFunction({ payload: webhookBody }, { notion }, { process });
      } catch (error) {
        console.error(`Error processing finTxCreate webhook:`, error);
      }
    }
  },
});

worker.tool(SetTransactionCategoryMapping.name, {
  title: SetTransactionCategoryMapping.title,
  description: SetTransactionCategoryMapping.description,
  schema: SetTransactionCategoryMapping.schema,
  outputSchema: SetTransactionCategoryMapping.outputSchema,
  // NOTE: second argument is a context object that provides access to Notion client and other utilities
  execute: async (input, { notion }):
    Promise<{
      status: "ok" | "skipped" | "error";
      reason: string | null;
      category: string | null;
      mappingPageId: string | null
    }> => {
    return SetTransactionCategoryMapping.toolFunction({ input }, { notion }, { process });
  },
});
const syncs = worker.database("syncs", {
  type: "managed",
  initialTitle: "Syncs",
  primaryKeyProperty: "Sync ID",
  schema: {
    properties: {
      Name: Schema.title(),
      "Sync ID": Schema.richText(),
    },
  },
});
worker.sync("syncTransactionCategories", {
  database: syncs,
  schedule: "manual",
  execute: async (state, { notion }) => {
    console.log(`Retrieving environment variables for data source IDs...`);
    const FIN_TRANSACTIONS_DS_ID = process.env.FIN_TRANSACTIONS_DS_ID!;
    const CATEGORY_MAP_DS_ID = process.env.CATEGORY_MAP_DS_ID!;
    const BUDGET_CAT_DS_ID = process.env.BUDGET_CAT_DS_ID!;
    for await (const page of iteratePaginatedAPI(
      notion.dataSources.query,
      { data_source_id: FIN_TRANSACTIONS_DS_ID, filter: { property: "🗺️ Financial Category mapping", relation: { is_empty: true } } },
    )) {
      // Process each page result as it arrives
      console.log(page);
    };
    const syncID = `syncTransactionCategories-${Date.now().toString()}`;
    return {
      state: "synced",
      changes: [
        {
          "type": "upsert" as const,
          "key": syncID,
          "properties": {
            Name: Builder.title(`Sync: ${syncID}`),
            "Sync ID": Builder.richText(syncID),
          }
        }
      ],
      hasMore: false,
    };
  }
});
