import { App, Plugin, TFile, renderMath, finishRenderMath, loadMathJax } from 'obsidian';
import { MathLinksSettings, MathLinksSettingTab, DEFAULT_SETTINGS } from './settings';

export default class MathLinks extends Plugin {
    settings: MathLinksSettings;

    async onload() {
        await this.loadSettings();
        await loadMathJax();
        this.addSettingTab(new MathLinksSettingTab(this.app, this));
        const settings = this.settings;

        this.registerMarkdownPostProcessor((element, context) => {
            let file = this.app.vault.getAbstractFileByPath(context.sourcePath);
            if (!(file instanceof TFile))
                return null;
            else if (this.isExcluded(file, settings.excludedFilePaths))
                return null;

            element.querySelectorAll('.internal-link').forEach((outLinkEl) => {
                let outLinkFileName = decodeURI(outLinkEl.href.replace(/app\:\/\/obsidian\.md\//g, ''));
                let outLinkFile = this.app.metadataCache.getFirstLinkpathDest(outLinkFileName, "");
                let outLinkMathLink = this.getMathLink(outLinkFile);

                if (outLinkMathLink) {
                    if (outLinkEl.innerText == outLinkFileName || outLinkEl.innerText == outLinkFile.basename) {
                        let splits: [string, boolean][] = [];

                        let split = '';
                        let isMath = false;
                        for (let i = 0; i < outLinkMathLink.length; i++) {
                            let character = outLinkMathLink[i];
                            if (character === '$') {
                                if (split != '') {
                                    splits.push([split, isMath]);
                                    split = '';
                                }
                                isMath = !isMath;
                            } else {
                                split += character;
                            }

                            if (i == outLinkMathLink.length - 1 && split != '') {
                                splits.push([split, isMath]);
                            }
                        }

                        outLinkEl.innerText = '';
                        for (let i = 0; i < splits.length; i++) {
                            let word = splits[i][0];
                            if (splits[i][1]) {
                                let wordMath = renderMath(word, false);
                                let mathEl = outLinkEl.createSpan();
                                mathEl.replaceWith(wordMath);
                            } else {
                                let wordEl = outLinkEl.createSpan();
                                wordEl.innerText += word;
                            }
                        }

                        finishRenderMath();
                    }
                }
            })
        });
    }

    getMathLink(file: TFile): string {
        if (!file)
            return undefined;

        let mathLink = this.app.metadataCache.getFileCache(file)?.frontmatter?.mathLink;

        if (mathLink === 'auto')
            mathLink = this.generateMathLinkFromAuto(file);

        return mathLink;
    }

    generateMathLinkFromAuto(file: Tfile): string {
        let templates = this.settings.templates;
        let mathLink = file.name.replace('\.md', '');
        for (let i = 0; i < templates.length; i++) {
            let replaced = new RegExp(templates[i].replaced);
            let replacement = templates[i].replacement;

            let flags = '';
            if (templates[i].globalMatch)
                flags += 'g';
            if (!templates[i].sensitive)
                flags += 'i';

            if (templates[i].word)
                replaced = RegExp(replaced.source.replace(/^/, '\\b').replace(/$/, '\\b'), flags);
            else
                replaced = RegExp(replaced.source, flags);

            mathLink = mathLink.replace(replaced, replacement);
        }

        return mathLink;
    }

    isExcluded(file: TFile, excludedFilePaths: string[]): boolean {
        for (let i = 0; i < excludedFilePaths.length; i++) {
            let path = excludedFilePaths[i];
            if (path.isFile && file.path === path.path) {
                return true;
            } else if (!path.isFile) {
                let pathRegex = new RegExp(`\\b${path.path}/`);
                if (pathRegex.test(file.path))
                    return true;
            }
        }
        return false;
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
