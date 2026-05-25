import { j } from "@notionhq/workers/schema-builder";
/**
 * schema-builder definition of the expected input for this tool
 */
const InputModel = j.object({
    transactionPageId: j.uuid() // page ID of the transaction to update
});

export default InputModel;
