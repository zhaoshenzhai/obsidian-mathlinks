import { createEditorExtensions } from './links/preview';
import { Plugin, loadMathJax } from "obsidian";
import { MathLinksSettings, DEFAULT_SETTINGS } from "./settings/settings";
import { MathLinksSettingTab } from "./settings/tab"
import { MathLinksAPIAccount } from "./api/deprecated";
import { DeprecatedAPIProvider, NativeProvider, Provider } from "./api/provider";
import { generateMathLinks } from "./links/reading";
import { isExcluded } from "./utils";
import { update } from './api';
import { patchOutline } from './outline';

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

        this.registerEditorExtension(createEditorExtensions(this));

        this.registerEvent(this.app.metadataCache.on('changed', file => update(this.app, file)));
        // Force-update when switching between Reading & Editing views
        this.registerEvent(this.app.workspace.on('layout-change', () => update(this.app)));

        this.apiAccounts = [];

        // https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/55
        // Patch the core Outline view to render MathJax in it
        this.app.workspace.onLayoutReady(() => {
            const success = patchOutline(this);
            if (!success) {
                const eventRef = this.app.workspace.on('layout-change', () => {
                    const success = patchOutline(this);
                    if (success) this.app.workspace.offref(eventRef);
                });
                this.registerEvent(eventRef);
            }
        });
    }

    getAPIAccount(userPlugin: Readonly<Plugin>): MathLinksAPIAccount {
        let account = this.apiAccounts.find((account) => account.manifest.id == userPlugin.manifest.id);
        if (account) return account;

        account = new MathLinksAPIAccount(this, userPlugin.manifest, DEFAULT_SETTINGS.blockPrefix, () => null);
        this.apiAccounts.push(account);

        const provider = new DeprecatedAPIProvider(account);
        userPlugin.addChild(provider);
        this.registerProvider(provider);

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
        return this.providers.some(({ provider }) => provider.enableInSourceMode);
    }
}
