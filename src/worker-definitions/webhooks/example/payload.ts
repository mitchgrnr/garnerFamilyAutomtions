type WebHookPayload = {
  source: {
    type: string;
    automation_id: string;
    action_id: string;
    event_id: string;
    user_id: string;
    attempt: number;
  };
  data: {
    object: string;
    id: string;
    created_time: string;
    last_edited_time: string;
    created_by: { object: string; id: string };
    last_edited_by: { object: string; id: string };
    cover: unknown | null;
    icon: unknown | null;
    parent: { type: string; data_source_id: string; database_id: string };
    in_trash: boolean;
    is_archived: boolean;
    is_locked: boolean;
    properties: Record<string, unknown>;
    url: string;
    public_url: string | null;
    request_id: string;
  };
};

export class Payload {
  source: WebHookPayload["source"];
  data: WebHookPayload["data"];

  constructor(payload: WebHookPayload) {
    this.source = payload.source;
    this.data = payload.data;
  }

  static fromJSONString(body: string): Payload {
    const parsed = JSON.parse(body) as WebHookPayload;
    if (!parsed?.source || !parsed?.data) {
      throw new TypeError("Invalid finTxCreate webhook payload");
    }
    return new Payload(parsed);
  }

  static fromBody(body: unknown): Payload {
    if (typeof body === "string") {
      return Payload.fromJSONString(body);
    }
    return new Payload(body as WebHookPayload);
  }

  toJSONString(): string {
    return JSON.stringify({ source: this.source, data: this.data });
  }
}