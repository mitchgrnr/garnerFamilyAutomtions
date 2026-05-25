//Module definition file for webhook.  Allows you to export the entire definition as a single object under the webhook name.
/**
 * This file serves as the main entry point for the Example webhook definition. It exports the webHookDefinition object, which includes all necessary information about the webhook, such as its name, title, description, expected payload structure, and the function to execute when the webhook is triggered. By exporting this object, it can be easily imported and registered in the main application where the worker is defined.
 */
export { webHookDefinition as Example } from "./definition";
