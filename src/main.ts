import { FileView, Plugin, WorkspaceLeaf, loadMathJax } from "obsidian";
import { MathLinksSettings, DEFAULT_SETTINGS } from "./settings/settings";
import { MathLinksSettingTab } from "./settings/tab"
import { MathLinksAPIAccount } from "./api/api";
import { DeprecatedAPIProvider, NativeProvider, Provider } from "./api/provider";
import { generateMathLinks } from "./links/reading";
import { buildLivePreview } from "./links/preview";
import { isExcluded } from "./utils";

export default class MathLinks extends Plugin {
    settings: MathLinksSettings;
    apiAccounts: MathLinksAPIAccount[];
    providers: { provider: Provider, sortOrder: number }[] = [];
    nativeProvider: NativeProvider;

    async onload() {
        await this.loadSettings();
        await loadMathJax();

        this.nativeProvider = new NativeProvider(this);
        this.addChild(this.nativeProvider);
        this.registerProvider(this.nativeProvider, Infinity);

        // Markdown Post Processor for reading view
        this.registerMarkdownPostProcessor((element, context) => {
            let file = this.app.vault.getAbstractFileByPath(context.sourcePath);
            if (file && isExcluded(this, file)) {
                generateMathLinks(this, element, context);
            }
        });

        // Live-preview; update all when Obsidian launches
        this.app.workspace.onLayoutReady(() => {
            this.app.workspace.iterateRootLeaves((leaf: WorkspaceLeaf) => {
                if (leaf.view instanceof FileView && leaf.view.file && isExcluded(this, leaf.view.file)) {
                    buildLivePreview(this, leaf).then((livePreview) => {
                        this.registerEditorExtension(livePreview);
                    });
                }
            });
        });

        // Live-preview; update on leaf-change
        this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf) => {
            if (leaf.view instanceof FileView && leaf.view.file && isExcluded(this, leaf.view.file)) {
                buildLivePreview(this, leaf).then((livePreview) => {
                    this.registerEditorExtension(livePreview);
                });
            }
        });

        this.apiAccounts = [];
    }

    getAPIAccount(userPlugin: Readonly<Plugin>): MathLinksAPIAccount {
        let account = this.apiAccounts.find((account) => account.manifest.id == userPlugin.manifest.id);
        if (account) return account;

        account = new MathLinksAPIAccount(this, userPlugin.manifest, DEFAULT_SETTINGS.blockPrefix, () => null);
        this.apiAccounts.push(account);

        this.registerProvider(new DeprecatedAPIProvider(account));

        return account;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.addSettingTab(new MathLinksSettingTab(this.app, this));
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * @param provider 
     * @param sortOrder - An optional integer sort order. Defaults to 0. Lower number runs before higher numbers.
     */
    registerProvider(provider: Provider, sortOrder?: number) {
        this.providers.find(another => another.provider === provider)
            ?? this.providers.push({ provider, sortOrder: sortOrder ?? 0 });
    }

    iterateProviders(callback: (provider: Provider) => any) {
        this.providers
            .sort((p1, p2) => p1.sortOrder - p2.sortOrder)
            .forEach(({ provider }) => callback(provider));
    }

    enableInSourceMode(): boolean {
        return this.providers.some(({provider}) => provider.enableInSourceMode);
    }
}
