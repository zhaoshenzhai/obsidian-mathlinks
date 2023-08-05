import { App, Plugin, TFile, loadMathJax } from "obsidian";
import { generateMathLinks, isValid } from "./tools";
import { MathLinksSettings, MathLinksSettingTab, DEFAULT_SETTINGS } from "./settings";
import { buildLivePreview } from "./preview";
import { MathLinksAPI } from "./api";

export interface MathLinksMetadata {
    "mathLink"?: string;
    "mathLink-blocks"?: Record<string, string>
}

export default class MathLinks extends Plugin {
    settings: MathLinksSettings;
    externalMathLinks: Record<string, MathLinksMetadata> = {};
    api: MathLinksAPI;

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

        this.api = new MathLinksAPI(this);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        this.addSettingTab(new MathLinksSettingTab(this.app, this));
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
