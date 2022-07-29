import { App, Plugin, TFile } from 'obsidian';
import { MathLinksSettings, MathLinksSettingTab, DEFAULT_SETTINGS } from './settings';
import { formatRegex, isExcluded, getIncludedNotes } from './utils';

export default class MathLinks extends Plugin {
    settings: MathLinksSettings;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new MathLinksSettingTab(this.app, this));
        const settings = this.settings;

        const { vault } = this.app;
        const { workspace } = this.app;
        const { metadataCache } = this.app;
        const { fileManager } = this.app;

        // Runs when file is updated
        // Want to modify it so it runs only if a mathLink is updated/generated or if a link is created.
        metadataCache.on('changed', async (file: TFile, data: string, cache: CachedMetaData) => {
            if (settings.autoUpdate) {
                if (isExcluded(file, settings.excludedFilePaths))
                    return null;

                let mathLink = await getMathLink(file);
                if (mathLink != null && mathLink != undefined)
                    updateBackLinks(file, mathLink[0]);
                else
                    removeBackMathLinks(file);

                updateOutLinks(file);
            }
        });

        // Update all mathLinks
        this.addCommand({
            id: "update_all_mathlinks",
            name: "Update all links",
            callback: async () => {
                let allNotes = await vault.getMarkdownFiles();
                let allIncludedNotes = getIncludedNotes(allNotes, settings.excludedFilePaths);
                let updateNotice = new Notice('MathLinks: Updating...');

                let count = 0;
                allIncludedNotes.forEach(async (note) => {
                    let mathLink = await getMathLink(note);
                    if (mathLink != null && mathLink != undefined)
                        updateBackLinks(note, mathLink[0]);
                    else
                        removeBackMathLinks(note);

                    updateOutLinks(note);

                    count++;
                    updateNotice.setMessage(`MathLinks: Updating... ${count}/${allIncludedNotes.length}`);
                    if (count === allIncludedNotes.length) {
                        updateNotice.hide();
                        new Notice('MathLinks: Updated all links.');
                    }
                });
            }
        });

        // Update all links in backLinkFile
        async function updateBackLinks(file: TFile, mathLink: string): void {
            let backLinkFilePaths = getBackLinkFilePaths(file);
            if (backLinkFilePaths.length != 0) {
                backLinkFilePaths.forEach(async (backLinkFilePath) => {
                    let backLinkFile = vault.getAbstractFileByPath(backLinkFilePath);
                    if (backLinkFile instanceof TFile) {
                        let backLinkFileContent = await vault.read(backLinkFile);
                        let modified = convertToMathLinks(file.name, backLinkFileContent, mathLink);

                        if (backLinkFileContent != modified) {
                            vault.modify(backLinkFile, modified);
                        }
                    }
                });
            }
        }

        async function removeBackMathLinks(file: TFile): void {
            let backLinkFilePaths = getBackLinkFilePaths(file);
            if (backLinkFilePaths.length != 0) {
                backLinkFilePaths.forEach(async (backLinkFilePath) => {
                    let backLinkFile = vault.getAbstractFileByPath(backLinkFilePath);
                    if (backLinkFile instanceof TFile) {
                        let backLinkFileContent = await vault.read(backLinkFile);
                        let modified = convertToDoubleLinks(file.name, backLinkFileContent);

                        if (backLinkFileContent != modified) {
                            vault.modify(backLinkFile, modified);
                        }
                    }
                });
            }
        }

        // Update outLinks in file
        async function updateOutLinks(file: TFile): void {
            let fileContent = await vault.read(file);
            let modified = fileContent;

            let outLinks = await metadataCache.getFileCache(file).links;
            if (outLinks != undefined) {
                outLinks.forEach(async (outLink) => {
                    let outLinkFileName = outLink.link;
                    if (outLink.displayText != "")
                        outLinkFileName = outLinkFileName.replace(/$/, '.md');

                    let outLinkFilePath = fileManager.getNewFileParent(outLinkFileName).path + '/' + outLinkFileName;
                    let outLinkFile = vault.getAbstractFileByPath(outLinkFilePath);

                    if (outLinkFile instanceof TFile) {
                        let outLinkMathLink = await getMathLink(outLinkFile);
                        if (outLinkMathLink != null && outLinkMathLink != undefined) {
                            modified = convertToMathLinks(outLinkFileName, modified, outLinkMathLink[0]);

                            if (fileContent != modified) {
                                await vault.modify(file, modified);
                            }
                        }
                    }
                });
            }
        }

        // Get mathLink as string (with lineNumber).
        //     If key exists but not value, return null (with lineNumber).
        //     Undefined otherwise.
        async function getMathLink(file: TFile): [string, number] | [null, number] | undefined {
            let contents = await vault.read(file);
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
                                    let mathLink = await generateMathLinkFromAuto(file);
                                    return [mathLink, lineNumber];
                                }
                                return [value, lineNumber];
                            } else {
                                return [null, lineNumber];
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
        async function generateMathLinkFromAuto(file: Tfile): string {
            let templates = settings.templates;
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

        // Generate backLinkFilePaths of file
        function getBackLinkFilePaths(file: Tfile): string[] {
            let backLinkFilePaths: string[] = [];
            Object.keys(metadataCache.resolvedLinks).forEach((key) => {
                let links = metadataCache.resolvedLinks[key];
                Object.keys(links).forEach((link) => {
                    if (link === file.path) {
                        backLinkFilePaths.push(key);
                    }
                });
            });

            return backLinkFilePaths;
        }

        // Convert mixed and double links to mathLinks
        function convertToMathLinks(fileName: string, fileContent: string, mathLink: string): string {
            let left = mathLink.replace(/^/, '[').replace(/$/, ']');
            let right = fileName.replace(/^/, '(').replace(/$/, ')').replace(/\s/g, '%20');
            let newLink = `${left}${right}`;

            let mixedLink = new RegExp('\\[((?!\\]\\(|\\]\\]).)*\\]' + formatRegex(right), 'g');
            let doubleLink = new RegExp(formatRegex(fileName.replace(/^/, '\[\[').replace(/\.md$/, '\]\]')), 'g');

            return fileContent.replace(mixedLink, newLink).replace(doubleLink, newLink);
        }

        // Convert mathLinks to double links
        function convertToDoubleLinks(fileName: string, fileContent: string): string {
            let formattedName = fileName.replace(/^/, '(').replace(/$/, ')').replace(/\s/g, '%20');

            let mixedLink = new RegExp('\\[((?!\\]\\(|\\]\\]).)*\\]' + formatRegex(formattedName), 'g');
            let doubleLink = fileName.replace(/^/, '[[').replace(/\.md$/, ']]');

            return fileContent.replace(mixedLink, doubleLink);
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
