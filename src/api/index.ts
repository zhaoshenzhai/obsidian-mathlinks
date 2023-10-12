export type { MathLinksMetadata, MathLinksMetadataSet, MathLinksAPIAccount } from "./api";
export { Provider } from './provider';

import { TFile, type App, type Plugin } from "obsidian";
import { MathLinksAPIAccount, informChange } from "./api";
import { Provider } from "./provider";
import MathLinks from "../main";


export function addProvider<CustomProvider extends Provider>(app: App, providerFactory: (mathLinks: MathLinks) => CustomProvider): CustomProvider {
    if (!isPluginEnabled(app)) throw Error("MathLinks API: MathLinks is not enabled.");
    const mathLinks = app.plugins.plugins.mathlinks as MathLinks;
    const provider = providerFactory(mathLinks);
    mathLinks.registerProvider(provider);
    return provider;
}

export function isPluginEnabled(app: App) {
    return app.plugins.enabledPlugins.has("mathlinks");
}

/**
 * Inform MathLinks that it should update the display text of links.
 * If `file` is given, MathLinks will only update the notes affected by changes in that file.
 * Otherwise, MathLinks will update all notes currently open.
 */
export function update(app: App, file?: TFile) {
    if (file) {
        informChange(app, "mathlinks:update", file);
    } else {
        informChange(app, "mathlinks:update-all");
    }
}


/**
 * Obsolete & Deprecated API
 */

/**
 * When called for the first time, register userPlugin as a user of MathLinks API and returns its account.
 * From the second time on, returns the existing account of userPlugin.
 * @deprecated Use {@link registerProvider} instead.
 */
export function getAPIAccount(userPlugin: Readonly<Plugin>): MathLinksAPIAccount | undefined {
    return userPlugin.app.plugins.plugins.mathlinks?.getAPIAccount(userPlugin);
}

/**
 * This function is obsolete and You don't call this function no more.
 * It will be removed in a future version.
 */
export const deleteAPIAccount = (userPlugin: Readonly<Plugin>): void => {
    let accounts = userPlugin.app.plugins.plugins.mathlinks?.apiAccounts;
    if (accounts) {
        let index = accounts.findIndex(
            (account) => account.manifest.id == userPlugin.manifest.id
        );
        accounts.splice(index, 1);
        informChange(userPlugin.app, "mathlinks:update-all");
    }
}
