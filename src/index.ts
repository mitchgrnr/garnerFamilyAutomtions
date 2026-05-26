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
      State: Schema.richText(),
    },
  },
});
worker.sync("syncTransactionCategories", {
  database: syncs,
  schedule: "manual",
  execute: async (state, { notion }) => {
    const syncID = `syncTransactionCategories-${Date.now().toString()}`;
    console.log(`Retrieving environment variables for data source IDs...`);
    const FIN_TRANSACTIONS_DS_ID = process.env.FIN_TRANSACTIONS_DS_ID!;
    const CATEGORY_MAP_DS_ID = process.env.CATEGORY_MAP_DS_ID!;
    const BUDGET_CAT_DS_ID = process.env.BUDGET_CAT_DS_ID!;
    console.log(`Starting sync to set transaction category mappings...`);
    let processedCount = 0;
    for await (const page of iteratePaginatedAPI(
      notion.dataSources.query,
      { data_source_id: FIN_TRANSACTIONS_DS_ID, filter: { property: "🗺️ Financial Category mapping", relation: { is_empty: true } } },
    )) {
      const categoryProp: any = (page as any).properties?.["Category"];
      const category: string | null = categoryProp?.select?.name ?? null;
      if (!category) {
        console.log(`Transaction ${page.id} has no category, skipping mapping.`);
        continue;
      }
      console.log(`Transaction category is ${category}, searching for mapping...`);
      // 2) Query mapping DB for exact Name match
      const mappingQuery = await notion.dataSources.query({
        data_source_id: CATEGORY_MAP_DS_ID,
        filter: { property: "Name", title: { equals: category } },
        page_size: 2,
      });
      let mappingPageId: string;
      if (mappingQuery.results.length === 1) {
        console.log(`Found mapping for category ${category} with page ID ${mappingQuery.results[0].id}`);
        mappingPageId = mappingQuery.results[0].id;
      } else if (mappingQuery.results.length > 1) {
        console.log(`Duplicate mapping rows found for category ${category}, cannot determine correct mapping.`);
        continue;
      } else {
        // 3) Find "Uncategorized" Budget Category
        console.log(`No mapping found for category ${category}, searching for Uncategorized budget category.`);
        const budgetQuery = await notion.dataSources.query({
          data_source_id: BUDGET_CAT_DS_ID,
          filter: { property: "Budget Category Name", title: { equals: "Uncategorized" } },
          page_size: 2,
        });
        if (budgetQuery.results.length !== 1) {
          console.log(`Uncategorized budget category not found/unique`);
          continue;
        }
        const uncategorizedId = budgetQuery.results[0].id;
        console.log(`Found Uncategorized budget category with ID ${uncategorizedId}, creating mapping for category ${category}.`);
        // 4) Create mapping row
        const created = await notion.pages.create({
          parent: { data_source_id: CATEGORY_MAP_DS_ID },
          properties: {
            Name: { title: [{ type: "text", text: { content: category } }] },
            "Budget Categories": { relation: [{ id: uncategorizedId }] },
          },
        });
        mappingPageId = created.id;
        console.log(`Created mapping page with ID ${mappingPageId} for category ${category}.`);
      }
      const updated = await withRetries(() =>
        notion.pages.update({
          page_id: page.id,
          properties: {
            "🗺️ Financial Category mapping": { relation: [{ id: mappingPageId }] },
          },
        })
      );
      console.log(`Updated transaction ${page.id} with category mapping relation to page ID ${mappingPageId}.`);
      processedCount++;
      console.log(`Processed ${processedCount} transaction(s) so far...`);
      if (processedCount === 10) {
        console.log(`Processed 10 transactions, ending run and returning with hasMore: true.`);
        return {
          state: "moreToSync",
          changes: [
            {
              "type": "upsert" as const,
              "key": syncID,
              "properties": {
                Name: Builder.title(`Sync: ${syncID}`),
                "Sync ID": Builder.richText(syncID),
                State: Builder.richText("moreToSync"),
              }
            }
          ],
          hasMore: true,
        };
      }
    };
    return {
      state: "synced",
      changes: [
        {
          "type": "upsert" as const,
          "key": syncID,
          "properties": {
            Name: Builder.title(`Sync: ${syncID}`),
            "Sync ID": Builder.richText(syncID),
            State: Builder.richText("synced"),
          }
        }
      ],
      hasMore: false,
    };
  }
});
async function withRetries<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // backoff: 500ms, 1s, 2s, 4s...
      const delayMs = 500 * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}
