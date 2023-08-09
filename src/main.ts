import { FileView, Plugin, WorkspaceLeaf, loadMathJax } from "obsidian";
import { MathLinksSettings, MathLinksSettingTab, DEFAULT_SETTINGS } from "./settings";
import { MathLinksAPIAccount } from "./api";
import { generateMathLinks } from "./links";
import { buildLivePreview } from "./preview";
import { isValid } from "./utils";

export default class MathLinks extends Plugin {
    settings: MathLinksSettings;
    apiAccounts: MathLinksAPIAccount[];

    async onload() {
        await this.loadSettings();
        await loadMathJax();

        this.registerMarkdownPostProcessor((element, context) => {
            if (isValid(this, context.sourcePath)) {
                generateMathLinks(this, element, context.sourcePath);
                // dynamically update the displayed text when an API user updates its metadata
                this.registerEvent(
                    this.app.metadataCache.on(
                        "mathlinks:updated", 
                        (apiAccount, path) => {
                            if (path == context.sourcePath) {
                                generateMathLinks(this, element, context.sourcePath);
                            }
                        }
                    )
                );
                // dynamically update the displayed text when an API account is deleted
                this.registerEvent(
                    this.app.metadataCache.on(
                        "mathlinks:account-deleted", 
                        (apiAccount) => {
                            generateMathLinks(this, element, context.sourcePath);
                        }
                    )
                );
            }
        });

        this.app.workspace.onLayoutReady(() => {
            this.app.workspace.iterateRootLeaves((leaf: WorkspaceLeaf) => {
                if (leaf.view instanceof FileView && leaf.view.file && isValid(this, leaf.view.file.path)) {
                    buildLivePreview(this, leaf).then((livePreview) => {
                        this.registerEditorExtension(livePreview);
                    });
                }
            });
        });

        this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf) => {
            if (leaf.view instanceof FileView && leaf.view.file && isValid(this, leaf.view.file.path)) {
                buildLivePreview(this, leaf).then((livePreview) => {
                    this.registerEditorExtension(livePreview);
                });
            }
        });

        this.apiAccounts = [];
    }

    getAPIAccount<UserPlugin extends Plugin>(userPlugin: Readonly<UserPlugin>): MathLinksAPIAccount {
        let account = this.apiAccounts.find((account) => account.manifest.id == userPlugin.manifest.id);
        if (account) return account;

        account = new MathLinksAPIAccount(
            this, 
            userPlugin.manifest, 
            DEFAULT_SETTINGS.blockPrefix, 
            DEFAULT_SETTINGS.enableFileNameBlockLinks
        );
        this.apiAccounts.push(account);
        return account;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.addSettingTab(new MathLinksSettingTab(this.app, this));
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
