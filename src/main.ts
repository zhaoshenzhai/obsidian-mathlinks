import { App, Plugin, TFile, loadMathJax } from "obsidian";
import { generateMathLinks, isValid } from "./tools";
import { MathLinksSettings, MathLinksSettingTab, DEFAULT_SETTINGS } from "./settings";
import { buildLivePreview } from "./preview";
import { MathLinksAPIAccount } from "./api";

export interface MathLinksMetadata {
    "mathLink"?: string;
    "mathLink-blocks"?: Record<string, string>
}

export type MathLinksMetadataSet = Record<string, MathLinksMetadata>; // {[path]: [metadata for the file], ...}

export default class MathLinks extends Plugin {
    settings: MathLinksSettings;
    apiAccounts: MathLinksAPIAccount[];

    async onload() {
        await this.loadSettings();
        await loadMathJax();

        this.registerMarkdownPostProcessor((element, context) => {
            if (isValid(this, context.containerEl, context.sourcePath)) {
                generateMathLinks(this, element, context.sourcePath);
            }
        });

        this.app.workspace.onLayoutReady(()=> {
            this.app.workspace.iterateRootLeaves((leaf: WorkspaceLeaf) => {
                if (leaf.view.file && isValid(this, leaf.containerEl, leaf.view.file.path)) {
                    buildLivePreview(this, leaf).then((livePreview) => {
                        this.registerEditorExtension(livePreview);
                    });
                }
            });
        });

        this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf) => {
            if (leaf.view.file && isValid(this, leaf.containerEl, leaf.view.file.path)) {
                buildLivePreview(this, leaf).then((livePreview) => {
                    this.registerEditorExtension(livePreview);
                });
            }
        });

        this.apiAccounts = [];
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.addSettingTab(new MathLinksSettingTab(this.app, this));
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    getAPIAccount(plugin: Plugin, blockPrefix: string = "^") {
        // register `plugin` as a user of MathLinks API and return the account
        let pluginID = plugin.manifest.id;
        // If the account already exists, return it
        let account = this.apiAccounts.find(
            (account) => account.pluginID == pluginID
        );
        if (account) {
            return account;  
        }
        // If not, create a new one
        account = new MathLinksAPIAccount(this, pluginID, blockPrefix);
        this.apiAccounts.push(account);
        return account;
    }
}
