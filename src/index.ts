export * from "./api";

import type { App, Plugin } from "obsidian";
import { MathLinksAPIAccount } from "./api";

/**
 * When called for the first time, register userPlugin as a user of MathLinks API and returns its account.
 * From the second time on, returns the existing account of userPlugin.
 */
export function getAPIAccount<UserPlugin extends Plugin>(userPlugin: Readonly<UserPlugin>): MathLinksAPIAccount | undefined {
    return userPlugin.app.plugins.plugins.mathlinks?.getAPIAccount<UserPlugin>(userPlugin);
}

export const isPluginEnabled = (app: App) => app.plugins.enabledPlugins.has("mathlinks");
