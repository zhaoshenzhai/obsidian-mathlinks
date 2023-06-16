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
            if (!isValid(this.app, context, settings)) return null;

            element.querySelectorAll('.internal-link').forEach((outLinkEl) => {
                let outLinkFileName = decodeURI(outLinkEl.href.replace(/app\:\/\/obsidian\.md\//g, ''));
                let outLinkFile = this.app.metadataCache.getFirstLinkpathDest(outLinkFileName, "");
                let outLinkMathLink = getMathLink(this, outLinkFile);

                if (outLinkMathLink) {
                    if (outLinkEl.innerText == outLinkFileName || outLinkEl.innerText == outLinkFile.basename) {
                        outLinkEl = replaceWithMathLink(outLinkEl, outLinkMathLink);
                    }
                }
            })
        });

        this.app.workspace.on("layout-change", () => {
            let viewState = this.app.workspace.getLeaf().getViewState().state;
            if (viewState.mode == "source" && viewState.source == false) {
                let livePreview = buildLivePreview(this, this.app);
                this.registerEditorExtension(livePreview);
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
