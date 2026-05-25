import { Payload } from "./payload";
/**
 * Contains the logic to be executed when the webhook is triggered. This function will be called with the payload of the webhook and an instance of the Notion client.
 * @param payload The payload of the webhook, which should conform to the Payload type defined in payload.ts. This will contain the data sent by the webhook trigger.
 * @param notion An instance of the Notion client, which can be used to interact with the Notion API. This allows you to perform actions such as reading or writing data to Notion based on the webhook event. 
 */
export function WebHookFunction({ payload }: { payload: Payload; }, { notion }: { notion: any }): void {
    console.log("Example payload:", payload);
}