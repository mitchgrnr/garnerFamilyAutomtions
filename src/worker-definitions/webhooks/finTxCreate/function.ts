import { Payload } from "./payload";
import { Client } from "@notionhq/client";

export async function WebHookFunction({ payload }: { payload: Payload; }, { notion }: { notion: Client }, { process }: { process: any }): Promise<void> {
    console.log("Received finTxCreate webhook with payload:", payload);
    //Get page
    console.log(`Retrieving transaction page with ID ${payload.data.id}`);
    const finTx = await notion.pages.retrieve({ page_id: payload.data.id });
    console.log(`Retrieved transaction page: ${JSON.stringify(finTx)}`);
    //Get environment variables for data source IDs
    console.log(`Retrieving environment variables for data source IDs...`);
    const FIN_TRANSACTIONS_DS_ID = process.env.FIN_TRANSACTIONS_DS_ID!;
    const CATEGORY_MAP_DS_ID = process.env.CATEGORY_MAP_DS_ID!;
    const BUDGET_CAT_DS_ID = process.env.BUDGET_CAT_DS_ID!;
    console.log(`Using FIN_TRANSACTIONS_DS_ID: ${FIN_TRANSACTIONS_DS_ID}`);
    console.log(`Using CATEGORY_MAP_DS_ID: ${CATEGORY_MAP_DS_ID}`);
    console.log(`Using BUDGET_CAT_DS_ID: ${BUDGET_CAT_DS_ID}`);
    const categoryProp: any = (finTx as any).properties?.["Category"];
    const category: string | null = categoryProp?.select?.name ?? null;
    if (!category) {
        console.log(`Transaction ${payload.data.id} has no category, skipping mapping.`);
        return;
    }
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
        return;
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
            return;
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
    // 5) Update the transaction relation (overwrite to stay in sync)
    const updated = await notion.pages.update({
        page_id: payload.data.id,
        properties: {
            "🗺️ Financial Category mapping": { relation: [{ id: mappingPageId }] },
        },
    });
    console.log(`Updated transaction ${payload.data.id} with category mapping relation to page ID ${mappingPageId}.`);

}