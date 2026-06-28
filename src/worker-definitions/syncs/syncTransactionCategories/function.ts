import { Client, iteratePaginatedAPI } from "@notionhq/client";
import * as Builder from "@notionhq/workers/builder";
import { withRetries } from "../../../utils";

interface SyncEnv {
  FIN_TRANSACTIONS_DS_ID: string;
  CATEGORY_MAP_DS_ID: string;
  BUDGET_CAT_DS_ID: string;
}

/**
 * Main execute handler for the category mapping backfill sync.
 */
export default async function SyncFunction(state: any, { notion }: { notion: any }): Promise<any> {
  const process = (globalThis as any).process;
  const env = {
    FIN_TRANSACTIONS_DS_ID: process.env.FIN_TRANSACTIONS_DS_ID!,
    CATEGORY_MAP_DS_ID: process.env.CATEGORY_MAP_DS_ID!,
    BUDGET_CAT_DS_ID: process.env.BUDGET_CAT_DS_ID!,
  };
  const syncID = `syncTransactionCategories-${Date.now()}`;
  let processedCount = 0;

  for await (const page of queryUnmappedTransactions(notion, env.FIN_TRANSACTIONS_DS_ID)) {
    await processTransactionCategory(notion, page, env);
    processedCount++;
    if (processedCount >= 10) {
      return buildSyncResult(syncID, "moreToSync", true);
    }
  }
  return buildSyncResult(syncID, "synced", false);
}

function queryUnmappedTransactions(notion: Client, dataSourceId: string) {
  return iteratePaginatedAPI(notion.dataSources.query, {
    data_source_id: dataSourceId,
    filter: { property: "🗺️ Financial Category mapping", relation: { is_empty: true } },
  });
}

async function processTransactionCategory(notion: Client, page: any, env: SyncEnv): Promise<void> {
  const category = page.properties?.["Category"]?.select?.name ?? null;
  if (!category) {
    console.log(`Transaction ${page.id} has no category, skipping mapping.`);
    return;
  }
  const mappingPageId = await getOrCreateCategoryMapping(notion, category, env);
  if (!mappingPageId) return;

  await withRetries(() =>
    notion.pages.update({
      page_id: page.id,
      properties: { "🗺️ Financial Category mapping": { relation: [{ id: mappingPageId }] } },
    })
  );
  console.log(`Updated transaction ${page.id} with category mapping relation to page ID ${mappingPageId}.`);
}

async function getOrCreateCategoryMapping(notion: Client, category: string, env: SyncEnv): Promise<string | null> {
  const query = await notion.dataSources.query({
    data_source_id: env.CATEGORY_MAP_DS_ID,
    filter: { property: "Name", title: { equals: category } },
    page_size: 2,
  });
  if (query.results.length === 1) {
    return query.results[0].id;
  }
  if (query.results.length > 1) {
    console.log(`Duplicate mapping rows found for category ${category}`);
    return null;
  }
  return createCategoryMapping(notion, category, env);
}

async function createCategoryMapping(notion: Client, category: string, env: SyncEnv): Promise<string | null> {
  const budgetQuery = await notion.dataSources.query({
    data_source_id: env.BUDGET_CAT_DS_ID,
    filter: { property: "Budget Category Name", title: { equals: "Uncategorized" } },
    page_size: 2,
  });
  if (budgetQuery.results.length !== 1) {
    console.log(`Uncategorized budget category not found/unique`);
    return null;
  }
  const created = await notion.pages.create({
    parent: { data_source_id: env.CATEGORY_MAP_DS_ID },
    properties: {
      Name: { title: [{ type: "text", text: { content: category } }] },
      "Budget Categories": { relation: [{ id: budgetQuery.results[0].id }] },
    },
  });
  return created.id;
}

function buildSyncResult(syncID: string, state: string, hasMore: boolean) {
  return {
    state,
    changes: [
      {
        type: "upsert" as const,
        key: syncID,
        properties: {
          Name: Builder.title(`Sync: ${syncID}`),
          "Sync ID": Builder.richText(syncID),
          State: Builder.richText(state),
        },
      },
    ],
    hasMore,
  };
}
