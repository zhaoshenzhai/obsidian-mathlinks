import { MarkdownView, Plugin, TFile, loadMathJax } from "obsidian";
import { StateEffect } from '@codemirror/state';
import { createEditorExtensions } from './links/preview';
import { MathLinksSettings, DEFAULT_SETTINGS } from "./settings/settings";
import { MathLinksSettingTab } from "./settings/tab"
import { MathLinksAPIAccount } from "./api/deprecated";
import { DeprecatedAPIProvider, NativeProvider, Provider } from "./api/provider";
import { generateMathLinks } from "./links/reading";
import { isExcluded } from "./utils";
import { patchOutline } from './outline';

export default class MathLinks extends Plugin {
    settings: MathLinksSettings;
    apiAccounts: MathLinksAPIAccount[];
    providers: { provider: Provider, sortOrder: number }[] = [];
    nativeProvider: NativeProvider;
    forceUpdateEffect = StateEffect.define<null>();

    async onload() {
        await this.loadSettings();
        await loadMathJax();

        this.nativeProvider = new NativeProvider(this);
        this.addChild(this.nativeProvider);
        this.registerProvider(this.nativeProvider, Infinity);

        // Markdown Post Processor for reading view
        this.registerMarkdownPostProcessor((element, context) => {
            let file = this.app.vault.getAbstractFileByPath(context.sourcePath);
            if (!file || !isExcluded(this, file)) {
                // - !file: true if this is a canvas card that is not an embed of an existing note
                // - !isExcluded: true if 
                //     1. this is a canvas "add note from vault" card, or
                //     2. this is a normal (non-canvas) markdown view
                //   and the associated file is not excluded by the setting
                generateMathLinks(this, element, context);
            }
        });

        this.registerEditorExtension(createEditorExtensions(this));

        this.registerEvent(this.app.metadataCache.on('changed', file => this.update(file)));
        // Force-update when switching between Reading & Editing views
        this.registerEvent(this.app.workspace.on('layout-change', () => this.update()));

        this.apiAccounts = [];

        // https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/55
        // Patch the core Outline view to render MathJax in it; try until successful
        this.app.workspace.onLayoutReady(() => {
            if (this.settings.renderOutline && (this.app as any).internalPlugins.plugins.outline.enabled) {
                const success = patchOutline(this);
                if (!success) {
                    const eventRef = this.app.workspace.on('layout-change', () => {
                        const success = patchOutline(this);
                        if (success) this.app.workspace.offref(eventRef);
                    });
                    this.registerEvent(eventRef);
                }
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

    update(file?: TFile) {
        if (file) {
            this._update("mathlinks:update", file);
        } else {
            this._update("mathlinks:update-all");
        }
    }

    // eventName: see src/type.d.ts
    private _update(...args: [eventName: "mathlinks:update", file: TFile] | [eventName: "mathlinks:update-all"]) {
        // trigger an event informing this update
        const [eventName, file] = args;
        this.app.metadataCache.trigger(eventName, file);

        // refresh mathLinks display based on the new metadata
        this.app.workspace.iterateAllLeaves((leaf) => {
            if (leaf.view instanceof MarkdownView && leaf.view.getMode() === 'source') {
                const editorView = leaf.view.editor.cm;
                if (!editorView) return; // ignore the legacy editor

                // Should dispatch if no file is specified (i.e. "update-all")
                let shouldDispatch = !file;
                // Should dispatch if Obsidian is still yet to resolve links
                shouldDispatch ||= !this.app.metadataCache.resolvedLinks;
                if (file && leaf.view.file && this.app.metadataCache.resolvedLinks[leaf.view.file.path]) {
                    // Should dispatch if the opened file (leaf.view.file) links to the changed file (file)
                    shouldDispatch ||= file.path in this.app.metadataCache.resolvedLinks[leaf.view.file.path];
                }
                if (shouldDispatch) {
                    editorView.dispatch({ effects: this.forceUpdateEffect.of(null) });
                }
            }
        });
    }

}
