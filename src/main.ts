import { App, Plugin, TFile, renderMath, finishRenderMath } from 'obsidian';
import { MathLinksSettings, MathLinksSettingTab, DEFAULT_SETTINGS } from './settings';
import { formatRegex, isExcluded } from './utils';

export default class MathLinks extends Plugin {
    settings: MathLinksSettings;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new MathLinksSettingTab(this.app, this));
        const settings = this.settings;

        this.registerMarkdownPostProcessor((element, context) => {
            let file = this.app.vault.getAbstractFileByPath(context.sourcePath);
            if (!(file instanceof TFile))
                return null;
            else if (isExcluded(file, settings.excludedFilePaths))
                return null;

            element.querySelectorAll('.internal-link').forEach(async (outLinkEl) => {
                let outLinkFileName = outLinkEl.href.replace(/app\:\/\/obsidian\.md\//g, '').replace(/%20/g, ' ');
                let outLinkFileExt = outLinkFileName.substring(outLinkFileName.length - 3, outLinkFileName.length);
                if (outLinkFileExt != '.md')
                    outLinkFileName = outLinkFileName.replace(/$/, '.md');

                let outLinkFilePath = this.app.fileManager.getNewFileParent(outLinkFileName).path + '/' + outLinkFileName;
                let outLinkFile = this.app.vault.getAbstractFileByPath(outLinkFilePath);
                let outLinkMathLink = await this.getMathLink(outLinkFile);

                if (outLinkMathLink) {
                    let splits: [string, boolean][] = [];

                    let split = '';
                    let isMath = false;
                    for (let i = 0; i < outLinkMathLink[0].length; i++) {
                        let character = outLinkMathLink[0][i];
                        if (character === '$') {
                            if (split != '') {
                                splits.push([split, isMath]);
                                split = '';
                            }
                            isMath = !isMath;
                        } else {
                            split += character;
                        }

                        if (i == outLinkMathLink[0].length - 1 && split != '') {
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
            })
        });
    }

    async getMathLink(file: TFile): [string, boolean] | undefined {
        if (!file)
            return undefined;

        let mathLink = this.app.metadataCache.getFileCache(file)?.frontmatter?.mathLink;
        let auto = false;

        if (!mathLink) {
            return undefined;
        } else if (mathLink === 'auto') {
            mathLink = await this.generateMathLinkFromAuto(file);
            auto = true;
        }

        return [mathLink, auto];
    }

    async generateMathLinkFromAuto(file: Tfile): string {
        let templates = this.settings.templates;
        let mathLink = file.name.replace('\.md', '');
        for (let i = 0; i < templates.length; i++) {
            let replaced = new RegExp(formatRegex(templates[i].replaced));
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

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
