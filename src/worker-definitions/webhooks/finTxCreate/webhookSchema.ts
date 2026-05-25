import { j } from "@notionhq/workers/schema-builder";

export const finTxCreateWebhookSchema = j.object({
  source: j.object({
    type: j.string(),
    automation_id: j.string(),
    action_id: j.string(),
    event_id: j.string(),
    user_id: j.string(),
    attempt: j.number(),
  }),

  data: j.object({
    object: j.string(),
    id: j.string(),
    created_time: j.string(),
    last_edited_time: j.string(),

    created_by: j.object({
      object: j.string(),
      id: j.string(),
    }),

    last_edited_by: j.object({
      object: j.string(),
      id: j.string(),
    }),

    cover: j.any().nullable(),
    icon: j.any().nullable(),

    parent: j.object({
      type: j.string(),
      data_source_id: j.string(),
      database_id: j.string(),
    }),

    in_trash: j.boolean(),
    is_archived: j.boolean(),
    is_locked: j.boolean(),

    // Key change is here:
    properties: j.object({}).describe("Notion properties map (dynamic object)"),

    url: j.string(),
    public_url: j.string().nullable(),
    request_id: j.string(),
  }),
});