import { j } from "@notionhq/workers/schema-builder";
/**
 * schema-builder definition of the expected output for this tool
 */
const OutputModel = j.object({
    status: j.enum("ok", "skipped", "error"),
    reason: j.string().nullable(),
    category: j.string().nullable(),
    mappingPageId: j.string().nullable(),
});
export default OutputModel;
