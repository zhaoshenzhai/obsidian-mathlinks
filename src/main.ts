import { App, Plugin, TFile } from 'obsidian';
import { MathLinksSettings, MathLinksSettingTab, DEFAULT_SETTINGS } from './settings';
import { formatRegex, isExcluded, getIncludedNotes } from './utils';
import * as fs from 'fs';

export default class MathLinks extends Plugin {
    settings: MathLinksSettings;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new MathLinksSettingTab(this.app, this));
        const settings = this.settings;

        this.app.metadataCache.on('changed', async (file: TFile, data: string, cache: CachedMetaData) => {
            if (!settings.autoUpdate || isExcluded(file, settings.excludedFilePaths))
                return null;

            let mathLink = await this.getMathLink(file);
            if (mathLink != null && mathLink != undefined)
                this.updateBackLinks(file, mathLink[0]);
            else
                this.removeBackMathLinks(file);

            this.updateOutLinks(file);
        });

        this.addCommand({
            id: "update_all_mathlinks",
            name: "Update all links",
            callback: async () => {
                let allNotes = await this.app.vault.getMarkdownFiles();
                let allIncludedNotes = getIncludedNotes(allNotes, settings.excludedFilePaths);
                let updateNotice = new Notice('MathLinks: Updating...');

                let count = 0;
                allIncludedNotes.forEach(async (note) => {
                    let mathLink = await this.getMathLink(note);
                    if (mathLink != null && mathLink != undefined)
                        this.updateBackLinks(note, mathLink[0]);
                    else
                        this.removeBackMathLinks(note);

                    count++;
                    updateNotice.setMessage(`MathLinks: Updating... ${count}/${allIncludedNotes.length}`);
                    if (count === allIncludedNotes.length) {
                        updateNotice.hide();
                        new Notice('MathLinks: Updated all links');
                    }
                });
            }
        });
    }

    async getMathLink(file: TFile): [string, boolean] | null | undefined {
        let contents = await this.app.vault.read(file);
        contents = contents.split(/\r?\n/);

        if (contents[0] === '---') {
            for (let lineNumber = 1; lineNumber < contents.length; lineNumber++) {
                let line = contents[lineNumber];
                if (line.length < 10) {
                    lineNumber++;
                } else {
                    let key = line.substring(0, 10);
                    if (key === 'mathLink: ') {
                        let value = line.replace(key, '');
                        if (value != '') {
                            if (value === 'auto') {
                                let mathLink = await this.generateMathLinkFromAuto(file);
                                return [mathLink, true];
                            }
                            return [value, false];
                        } else {
                            return null;
                        }
                    } else if (line === '---') {
                        return undefined;
                    } else {
                        lineNumber++;
                    }
                }
            }
        }
        return undefined;
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

    async updateBackLinks(file: TFile, mathLink: string): void {
        let backLinkFilePaths = this.getBackLinkFilePaths(file);
        if (backLinkFilePaths.length != 0) {
            backLinkFilePaths.forEach(async (backLinkFilePath) => {
                let backLinkFile = this.app.vault.getAbstractFileByPath(backLinkFilePath);
                if (backLinkFile instanceof TFile) {
                    let backLinkFileContent = await this.app.vault.read(backLinkFile);
                    let modified = this.convertToMathLinks(file.name, backLinkFileContent, mathLink);

                    if (backLinkFileContent != modified)
                        this.app.vault.modify(backLinkFile, modified);
                }
            });
        }
    }

    async removeBackMathLinks(file: TFile): void {
        let backLinkFilePaths = this.getBackLinkFilePaths(file);
        if (backLinkFilePaths.length != 0) {
            backLinkFilePaths.forEach(async (backLinkFilePath) => {
                let backLinkFile = this.app.vault.getAbstractFileByPath(backLinkFilePath);
                if (backLinkFile instanceof TFile) {
                    let backLinkFileContent = await this.app.vault.read(backLinkFile);
                    let vaultPath = this.app.vault.getRoot().vault.adapter.basePath;
                    let configDir = this.app.vault.configDir;
                    let modified = '';
                    let obsidianConfigFile = await fs.readFile(`${vaultPath}/${configDir}/app.json`, 'utf8', (err, data) => {
                        if (JSON.parse(data).useMarkdownLinks)
                            modified = this.convertToMarkdownLinks(file.name, backLinkFileContent);
                        else
                            modified = this.convertToDoubleLinks(file.name, backLinkFileContent);

                        if (backLinkFileContent != modified)
                            this.app.vault.modify(backLinkFile, modified);
                    });
                }
            });
        }
    }

    async updateOutLinks(file: TFile): void {
        let fileContent = await this.app.vault.read(file);
        let modified = fileContent;

        let count = 0;
        let outLinks = await this.app.metadataCache.getFileCache(file).links;
        if (outLinks != undefined) {
            outLinks.forEach(async (outLink) => {
                let outLinkFileName = outLink.link;
                if (outLink.displayText != "")
                    outLinkFileName = outLinkFileName.replace(/$/, '.md');

                let outLinkFilePath = this.app.fileManager.getNewFileParent(outLinkFileName).path + '/' + outLinkFileName;
                let outLinkFile = this.app.vault.getAbstractFileByPath(outLinkFilePath);

                if (outLinkFile instanceof TFile) {
                    let outLinkMathLink = await this.getMathLink(outLinkFile);
                    if (outLinkMathLink != null && outLinkMathLink != undefined)
                        modified = this.convertToMathLinks(outLinkFileName, modified, outLinkMathLink[0]);
                }

                count++;
                if (count === outLinks.length && fileContent != modified)
                    await this.app.vault.modify(file, modified);
            });
        }
    }

    async updateAutoNotes(): void {
        let allNotes = await this.app.vault.getMarkdownFiles();
        let allIncludedNotes = getIncludedNotes(allNotes, this.settings.excludedFilePaths);
        allIncludedNotes.forEach(async (note) => {
            let mathLink = await this.getMathLink(note);
            if (mathLink != null && mathLink != undefined && mathLink[1])
                this.updateBackLinks(note, mathLink[0]);
            else
                this.removeBackMathLinks(note);
        });
    }

    getBackLinkFilePaths(file: Tfile): string[] {
        let backLinkFilePaths: string[] = [];
        Object.keys(this.app.metadataCache.resolvedLinks).forEach((key) => {
            let links = this.app.metadataCache.resolvedLinks[key];
            Object.keys(links).forEach((link) => {
                if (link === file.path)
                    backLinkFilePaths.push(key);
            });
        });

        return backLinkFilePaths;
    }

    convertToMathLinks(fileName: string, fileContent: string, mathLink: string): string {
        let left = mathLink.replace(/^/, '[').replace(/$/, ']');
        let right = fileName.replace(/^/, '(').replace(/$/, ')').replace(/\s/g, '%20');
        let newLink = `${left}${right}`;

        let mixedLink = new RegExp('\\[((?!\\]\\(|\\]\\]).)*\\]' + formatRegex(right), 'g');
        let doubleLink = new RegExp(formatRegex(fileName.replace(/^/, '\[\[').replace(/\.md$/, '\]\]')), 'g');

        return fileContent.replace(mixedLink, newLink).replace(doubleLink, newLink);
    }

    convertToDoubleLinks(fileName: string, fileContent: string): string {
        let formattedName = fileName.replace(/^/, '(').replace(/$/, ')').replace(/\s/g, '%20');

        let mixedLink = new RegExp('\\[((?!\\]\\(|\\]\\]).)*\\]' + formatRegex(formattedName), 'g');
        let doubleLink = fileName.replace(/^/, '[[').replace(/\.md$/, ']]');

        return fileContent.replace(mixedLink, doubleLink);
    }

    convertToMarkdownLinks(fileName: string, fileContent: string): string {
        let formattedName = fileName.replace(/^/, '(').replace(/$/, ')').replace(/\s/g, '%20');

        let mixedLink = new RegExp('\\[((?!\\]\\(|\\]\\]).)*\\]' + formatRegex(formattedName), 'g');
        let markdownLink = fileName.replace(/^/, '[').replace(/\.md$/, `]${formattedName}`);

        return fileContent.replace(mixedLink, markdownLink);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
