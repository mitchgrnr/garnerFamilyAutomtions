import { Worker } from "@notionhq/workers";
import { j } from "@notionhq/workers/schema-builder";
import { FinTxCreateWebHook } from "./worker-definitions/webhooks/finTxCreate";
import { SetTransactionCategoryMapping } from "./worker-definitions/tools/setTransactionCategoryMapping";

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