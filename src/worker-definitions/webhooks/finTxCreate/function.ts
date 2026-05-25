import { Payload } from "./payload";

export function WebHookFunction({ payload }: { payload: Payload; }, { notion }: { notion: any }): void {
    console.log("Received finTxCreate webhook with payload:", payload);
}