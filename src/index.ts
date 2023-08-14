export type { MathLinksMetadata, MathLinksMetadataSet, MathLinksAPIAccount} from "./api";

import type { App, Plugin } from "obsidian";
import { MathLinksAPIAccount, informChange } from "./api";

/**
 * When called for the first time, register userPlugin as a user of MathLinks API and returns its account.
 * From the second time on, returns the existing account of userPlugin.
 */
export function getAPIAccount<UserPlugin extends Plugin>(userPlugin: Readonly<UserPlugin>): MathLinksAPIAccount | undefined {
    return userPlugin.app.plugins.plugins.mathlinks?.getAPIAccount<UserPlugin>(userPlugin);
}

export const deleteAPIAccount = <UserPlugin extends Plugin>(userPlugin: Readonly<UserPlugin>): void => {
    let accounts = userPlugin.app.plugins.plugins.mathlinks?.apiAccounts;
    if (accounts) {
        let index = accounts.findIndex(
            (account) => account.manifest.id == userPlugin.manifest.id
        );
        let account = accounts[index];
        accounts.splice(index, 1);
        informChange(userPlugin.app, "mathlinks:account-deleted", account);
    }
}

export const isPluginEnabled = (app: App) => app.plugins.enabledPlugins.has("mathlinks");
