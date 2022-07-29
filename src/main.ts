import { App, Plugin, TFile } from 'obsidian';
import { MathLinksSettings, MathLinksSettingTab, DEFAULT_SETTINGS } from './settings';
import { formatRegex, isExcluded, getIncludedNotes } from './utils';

export default class MathLinks extends Plugin {
    settings: MathLinksSettings;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new MathLinksSettingTab(this.app, this));
        const settings = this.settings;

        // Runs when file is updated
        // Want to modify it so it runs only if a mathLink is updated/generated or if a link is created.
        this.app.metadataCache.on('changed', async (file: TFile, data: string, cache: CachedMetaData) => {
            if (settings.autoUpdate) {
                if (isExcluded(file, settings.excludedFilePaths))
                    return null;

                let mathLink = await this.getMathLink(file);
                if (mathLink != null && mathLink != undefined)
                    this.updateBackLinks(file, mathLink[0]);
                else
                    this.removeBackMathLinks(file);

                this.updateOutLinks(file);
            }
        });

        // Update all mathLinks
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

                    this.updateOutLinks(note);

                    count++;
                    updateNotice.setMessage(`MathLinks: Updating... ${count}/${allIncludedNotes.length}`);
                    if (count === allIncludedNotes.length) {
                        updateNotice.hide();
                        new Notice('MathLinks: Updated all links.');
                    }
                });
            }
        });
    }

    // Get mathLink as string (with isAuto).
    //     If key exists but not value, return null.
    //     Undefined otherwise.
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

    // Generate mathLink from file.name
    async generateMathLinkFromAuto(file: Tfile): string {
        let templates = this.settings.templates;
        let baseName =  file.name.replace('\.md', '');
        let mathLink = baseName;
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

    // Update all links in backLinkFile
    async updateBackLinks(file: TFile, mathLink: string): void {
        let backLinkFilePaths = this.getBackLinkFilePaths(file);
        if (backLinkFilePaths.length != 0) {
            backLinkFilePaths.forEach(async (backLinkFilePath) => {
                let backLinkFile = this.app.vault.getAbstractFileByPath(backLinkFilePath);
                if (backLinkFile instanceof TFile) {
                    let backLinkFileContent = await this.app.vault.read(backLinkFile);
                    let modified = this.convertToMathLinks(file.name, backLinkFileContent, mathLink);

                    if (backLinkFileContent != modified) {
                        this.app.vault.modify(backLinkFile, modified);
                    }
                }
            });
        }
    }

    // Remove mathLinks in backLinkFile
    async removeBackMathLinks(file: TFile): void {
        let backLinkFilePaths = this.getBackLinkFilePaths(file);
        if (backLinkFilePaths.length != 0) {
            backLinkFilePaths.forEach(async (backLinkFilePath) => {
                let backLinkFile = this.app.vault.getAbstractFileByPath(backLinkFilePath);
                if (backLinkFile instanceof TFile) {
                    let backLinkFileContent = await this.app.vault.read(backLinkFile);
                    let modified = this.convertToDoubleLinks(file.name, backLinkFileContent);

                    if (backLinkFileContent != modified) {
                        this.app.vault.modify(backLinkFile, modified);
                    }
                }
            });
        }
    }

    // Update outLinks in file
    async updateOutLinks(file: TFile): void {
        let fileContent = await this.app.vault.read(file);
        let modified = fileContent;

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
                    if (outLinkMathLink != null && outLinkMathLink != undefined) {
                        modified = this.convertToMathLinks(outLinkFileName, modified, outLinkMathLink[0]);

                        if (fileContent != modified) {
                            await this.app.vault.modify(file, modified);
                        }
                    }
                }
            });
        }
    }

    // Runs when template is modified
    async updateAutoNotes(): void {
        let allNotes = await this.app.vault.getMarkdownFiles();
        let allIncludedNotes = getIncludedNotes(allNotes, this.settings.excludedFilePaths);
        allIncludedNotes.forEach(async (note) => {
            let mathLink = await this.getMathLink(note);
            if (mathLink != null && mathLink != undefined) {
                if (mathLink[1]) {
                    this.updateBackLinks(note, mathLink[0]);
                }
            } else {
                this.removeBackMathLinks(note);
            }
        });
    }

    // Generate backLinkFilePaths of file
    getBackLinkFilePaths(file: Tfile): string[] {
        let backLinkFilePaths: string[] = [];
        Object.keys(this.app.metadataCache.resolvedLinks).forEach((key) => {
            let links = this.app.metadataCache.resolvedLinks[key];
            Object.keys(links).forEach((link) => {
                if (link === file.path) {
                    backLinkFilePaths.push(key);
                }
            });
        });

        return backLinkFilePaths;
    }

    // Convert mixed and double links to mathLinks
    convertToMathLinks(fileName: string, fileContent: string, mathLink: string): string {
        let left = mathLink.replace(/^/, '[').replace(/$/, ']');
        let right = fileName.replace(/^/, '(').replace(/$/, ')').replace(/\s/g, '%20');
        let newLink = `${left}${right}`;

        let mixedLink = new RegExp('\\[((?!\\]\\(|\\]\\]).)*\\]' + formatRegex(right), 'g');
        let doubleLink = new RegExp(formatRegex(fileName.replace(/^/, '\[\[').replace(/\.md$/, '\]\]')), 'g');

        return fileContent.replace(mixedLink, newLink).replace(doubleLink, newLink);
    }

    // Convert mathLinks to double links
    convertToDoubleLinks(fileName: string, fileContent: string): string {
        let formattedName = fileName.replace(/^/, '(').replace(/$/, ')').replace(/\s/g, '%20');

        let mixedLink = new RegExp('\\[((?!\\]\\(|\\]\\]).)*\\]' + formatRegex(formattedName), 'g');
        let doubleLink = fileName.replace(/^/, '[[').replace(/\.md$/, ']]');

        return fileContent.replace(mixedLink, doubleLink);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
