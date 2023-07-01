import { App, Plugin, TFile, loadMathJax } from "obsidian";
import { generateMathLinks, isValid } from "./tools";
import { MathLinksSettings, MathLinksSettingTab, DEFAULT_SETTINGS } from "./settings";
import { buildLivePreview } from "./preview";

export default class MathLinks extends Plugin {
    async onload() {
        await this.loadSettings();
        await loadMathJax();
        this.addSettingTab(new MathLinksSettingTab(this.app, this));
        const settings = this.settings;

        this.registerMarkdownPostProcessor(async (element, context) => {
            if (isValid(this, settings, context.containerEl, context.sourcePath)) {
                generateMathLinks(this, context.containerEl).then((result) => {
                    generateMathLinks(this, element);
                });
            }
        });

        this.app.workspace.onLayoutReady(()=> {
            this.app.workspace.iterateAllLeaves((leaf: WorkspaceLeaf) => {
                buildLivePreview(this, leaf).then((livePreview) => {
                    this.registerEditorExtension(livePreview);
                });
            });
        });

        this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf) => {
            buildLivePreview(this, leaf).then((livePreview) => {
                this.registerEditorExtension(livePreview);
            });
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
