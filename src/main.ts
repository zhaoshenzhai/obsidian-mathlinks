import { App, Plugin, TFile, loadMathJax } from 'obsidian';
import { getMathLink, replaceWithMathLink, isValid } from './tools';
import { MathLinksSettings, MathLinksSettingTab, DEFAULT_SETTINGS } from './settings';
import { buildLivePreview } from './preview';

export default class MathLinks extends Plugin {
    async onload() {
        await this.loadSettings();
        await loadMathJax();
        this.addSettingTab(new MathLinksSettingTab(this.app, this));
        const settings = this.settings;

        this.registerMarkdownPostProcessor((element, context) => {
            if (isValid(this, settings, context.containerEl, context.sourcePath)) {
                // this.generateMathLinks(this, context.containerEl);
                this.generateMathLinks(this, context.containerEl);
            }
        });

        this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf) => {
            if (isValid(this, settings, leaf.containerEl, leaf.getViewState().state.file)) {
                this.generateMathLinks(this, leaf.containerEl);
            }
        });

        // this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf) => {
        //     let view = leaf.getViewState();
        //     if ((view.state.mode == "source" && view.state.source == false) || view.type == "canvas") {
        //         let livePreview = buildLivePreview(this, this.app, leaf);
        //         this.registerEditorExtension(livePreview);
        //     }
        // });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    generateMathLinks(plugin: MathLinks, element: HTMLElement) {
        element.querySelectorAll('.internal-link').forEach((outLinkEl) => {
            let outLinkText = outLinkEl.textContent.trim();
            let outLinkHTML = outLinkEl.innerHTML;
            let outLinkFileName = decodeURI(outLinkEl.href.replace(/app\:\/\/obsidian\.md\//g, '')).replace(/\.md$/, '');

            if (outLinkText != outLinkFileName && outLinkText != '' && outLinkHTML == outLinkText) {
                replaceWithMathLink(outLinkEl, outLinkText);
            } else {
                let outLinkFile = plugin.app.metadataCache.getFirstLinkpathDest(outLinkFileName, "");
                let outLinkMathLink = getMathLink(plugin, outLinkFile);
                if (outLinkMathLink) {
                    if (outLinkEl.innerText == outLinkFileName || outLinkEl.innerText == outLinkFile.basename) {
                        replaceWithMathLink(outLinkEl, outLinkMathLink);
                    }
                }
            }
        });
    }
}
