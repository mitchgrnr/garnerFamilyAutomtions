import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";
import * as finTxCreateWebHook from "./worker-definitions/webhooks/finTxCreate/definition";

const worker = new Worker();
export default worker;

const process = (globalThis as any).process;
const CATEGORY_MAP_DS_ID = process.env.CATEGORY_MAP_DS_ID!;
const BUDGET_CAT_DS_ID = process.env.BUDGET_CAT_DS_ID!;
const FIN_TRANSACTIONS_DS_ID = process.env.FIN_TRANSACTIONS_DS_ID!;

worker.webhook(finTxCreateWebHook.webHookDefinition.name, {
  title: finTxCreateWebHook.webHookDefinition.title,
  description: finTxCreateWebHook.webHookDefinition.description,
  execute: async (events, { notion }) => {
    for (const event of events) {
      console.log("Received event:", event.body);
      // Here you would add your logic to process the financial transaction creation event,
      // such as reading the transaction details from the event body, mapping categories,
      // and updating Notion pages accordingly.
    }
  },
});

worker.tool("setTransactionCategoryMapping", {
  title: "Set financial transaction category mapping",
  description: "Map financial transaction Category → mapping row; create mapping if missing; set relation.",
  schema: j.object({
    transactionPageId: j.uuid() // page ID of the transaction to update
  }),
  outputSchema: j.object({
    status: j.enum("ok", "skipped", "error"),
    reason: j.string().nullable(),
    category: j.string().nullable(),
    mappingPageId: j.string().nullable(),
  }),
  // NOTE: second argument is a context object that provides access to Notion client and other utilities
  execute: async (input, { notion }):
    Promise<{
      status: "ok" | "skipped" | "error";
      reason: string | null;
      category: string | null;
      mappingPageId: string | null
    }> => {
    const { transactionPageId } = input;

    // 1) Read the transaction page
    const tx = await notion.pages.retrieve({ page_id: transactionPageId });

    // Category is a Select in your DB
    const categoryProp: any = (tx as any).properties?.["Category"];
    const category: string | null = categoryProp?.select?.name ?? null;
    if (!category) return { status: "skipped", reason: "Category empty", category: null, mappingPageId: null };

    // 2) Query mapping DB for exact Name match
    const mappingQuery = await notion.dataSources.query({
      data_source_id: CATEGORY_MAP_DS_ID,
      filter: { property: "Name", title: { equals: category } },
      page_size: 2,
    });

    let mappingPageId: string;

    if (mappingQuery.results.length === 1) {
      mappingPageId = mappingQuery.results[0].id;
    } else if (mappingQuery.results.length > 1) {
      return { status: "error", reason: `Duplicate mapping rows for ${category}`, category: null, mappingPageId: null };
    } else {
      // 3) Find "Uncategorized" Budget Category
      const budgetQuery = await notion.dataSources.query({
        data_source_id: BUDGET_CAT_DS_ID,
        filter: { property: "Budget Category Name", title: { equals: "Uncategorized" } },
        page_size: 2,
      });
      if (budgetQuery.results.length !== 1) {
        return { status: "error", reason: `Uncategorized budget category not found/unique`, category: null, mappingPageId: null };
      }
      const uncategorizedId = budgetQuery.results[0].id;

      // 4) Create mapping row
      const created = await notion.pages.create({
        parent: { data_source_id: CATEGORY_MAP_DS_ID },
        properties: {
          Name: { title: [{ type: "text", text: { content: category } }] },
          "Budget Categories": { relation: [{ id: uncategorizedId }] },
        },
      });

      mappingPageId = created.id;
    }

    // 5) Update the transaction relation (overwrite to stay in sync)
    await notion.pages.update({
      page_id: transactionPageId,
      properties: {
        "🗺️ Financial Category mapping": { relation: [{ id: mappingPageId }] },
      },
    });

    return { status: "ok", reason: "Mapping updated", category: category, mappingPageId: mappingPageId };
  },
});