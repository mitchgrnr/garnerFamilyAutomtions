import { Client, iteratePaginatedAPI } from "@notionhq/client";
import * as Builder from "@notionhq/workers/builder";
import { withRetries } from "../../../utils";

/**
 * Main execute handler for the transaction names backfill sync.
 */
export default async function SyncFunction(state: any, { notion }: { notion: any }): Promise<any> {
  const process = (globalThis as any).process;
  const FIN_TRANSACTIONS_DS_ID = process.env.FIN_TRANSACTIONS_DS_ID!;
  const syncID = `syncTransactionNames-${Date.now()}`;
  let processedCount = 0;

  for await (const page of queryTransactionsNeedingName(notion, FIN_TRANSACTIONS_DS_ID)) {
    await processTransactionName(notion, page);
    processedCount++;
    if (processedCount >= 10) {
      return buildSyncResult(syncID, "moreToSync", true);
    }
  }
  return buildSyncResult(syncID, "synced", false);
}

function queryTransactionsNeedingName(notion: Client, dataSourceId: string) {
  return iteratePaginatedAPI(notion.dataSources.query, {
    data_source_id: dataSourceId,
    filter: {
      property: "NameFixNeeded",
      formula: { checkbox: { equals: true } },
    },
  });
}

async function processTransactionName(notion: Client, page: any): Promise<void> {
  const calculatedName = page.properties?.["Calculated Name"]?.formula?.string;
  if (!calculatedName) {
    console.log(`Transaction ${page.id} has no calculated name, skipping mapping.`);
    return;
  }
  await withRetries(() =>
    notion.pages.update({
      page_id: page.id,
      properties: {
        Transaction: {
          title: [{ text: { content: calculatedName } }],
        },
      },
    })
  );
  console.log(`Updated transaction ${page.id} name to ${calculatedName}.`);
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
