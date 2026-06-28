import { Payload } from "./payload";
import { Client } from "@notionhq/client";
import { withRetries } from "../../../utils";

interface WebhookEnv {
  CATEGORY_MAP_DS_ID: string;
  BUDGET_CAT_DS_ID: string;
}

/**
 * Webhook execute handler triggered when a financial transaction page is created.
 */
export async function WebHookFunction(
  { payload }: { payload: Payload },
  { notion }: { notion: Client },
  { process }: { process: any }
): Promise<void> {
  try {
    const finTx = await retrieveFinTxPage(notion, payload.data.id);
    if (!finTx) return;

    const env = {
      CATEGORY_MAP_DS_ID: process.env.CATEGORY_MAP_DS_ID!,
      BUDGET_CAT_DS_ID: process.env.BUDGET_CAT_DS_ID!,
    };
    const category = (finTx as any).properties?.["Category"]?.select?.name ?? null;
    if (!category) {
      console.log(`Transaction ${payload.data.id} has no category, skipping mapping.`);
      return;
    }
    const mappingPageId = await getOrCreateMappingForCategory(notion, category, env);
    if (!mappingPageId) return;

    await updateTransactionCategoryRelation(notion, payload.data.id, mappingPageId);
  } catch (error) {
    console.error(`Error in finTxCreate WebHookFunction:`, error);
  }
}

async function retrieveFinTxPage(notion: Client, pageId: string) {
  try {
    return await notion.pages.retrieve({ page_id: pageId });
  } catch (error) {
    console.error(`Error retrieving transaction page with ID ${pageId}:`, error);
    return null;
  }
}

async function getOrCreateMappingForCategory(notion: Client, category: string, env: WebhookEnv): Promise<string | null> {
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
  return createCategoryMapping(notion, category, env.CATEGORY_MAP_DS_ID, env.BUDGET_CAT_DS_ID);
}

async function createCategoryMapping(
  notion: Client,
  category: string,
  categoryMapDsId: string,
  budgetCatDsId: string
): Promise<string | null> {
  const budgetQuery = await notion.dataSources.query({
    data_source_id: budgetCatDsId,
    filter: { property: "Budget Category Name", title: { equals: "Uncategorized" } },
    page_size: 2,
  });
  if (budgetQuery.results.length !== 1) {
    console.log(`Uncategorized budget category not found/unique`);
    return null;
  }
  const created = await notion.pages.create({
    parent: { data_source_id: categoryMapDsId },
    properties: {
      Name: { title: [{ type: "text", text: { content: category } }] },
      "Budget Categories": { relation: [{ id: budgetQuery.results[0].id }] },
    },
  });
  return created.id;
}

async function updateTransactionCategoryRelation(notion: Client, pageId: string, mappingPageId: string): Promise<void> {
  await withRetries(() =>
    notion.pages.update({
      page_id: pageId,
      properties: {
        "🗺️ Financial Category mapping": { relation: [{ id: mappingPageId }] },
      },
    })
  );
  console.log(`Updated transaction ${pageId} with category mapping relation to page ID ${mappingPageId}.`);
}