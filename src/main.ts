import { App, Plugin, MarkdownView, TFile } from 'obsidian';
import { MathLinksSettingTab } from './settings';

interface MathLinksSettings {
    templates: string[];
}

const DEFAULT_SETTINGS: MathLinksSettings = {
    templates: []
}

export default class MathLinks extends Plugin {
    settings: MathLinksSettings;

    async onload() {
        await this.loadSettings();
        const settings = this.settings;

        const { vault } = this.app;
        const { workspace } = this.app;
        const { metadataCache } = this.app;
        const { fileManager } = this.app;

        // Update all links in backLinkFiles if file (with mathLink) is changed.
        //     Want to modify it so it runs only if a mathLink is updated/generated.
        // Generate mathLinks of outLinks in file if file  is change.
        //     Want to midify it so it runs only if a link is created.
        metadataCache.on('changed', async (file: TFile, data: string, cache: CachedMetaData) => {
            let mathLink = await getMathLink(file);
            if (mathLink != null && mathLink != undefined) {
                let backLinkFilePaths = getBackLinkFilePaths(file);
                if (backLinkFilePaths.length != 0) {
                    backLinkFilePaths.forEach(async (backLinkFilePath) => {
                        let backLinkFile = vault.getAbstractFileByPath(backLinkFilePath);
                        if (backLinkFile instanceof TFile) {
                            let backLinkFileContent = await vault.read(backLinkFile);
                            let modified = convertToMathLinks(file.name, backLinkFileContent, mathLink[0]);

                            if (backLinkFileContent != modified) {
                                vault.modify(backLinkFile, modified);
                            }
                        }
                    });
                }
            }

            let fileContent = await vault.read(file);
            let modified = fileContent;
            if (cache.links != undefined) {
                cache.links.forEach(async (outLink) => {
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
        });

        // Get mathLink as string (with lineNumber). If key exists but not value, return null (with lineNumber). Undefined otherwise.
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

        // Generate mathLink from 'mathLink: auto' and file.name
        async function generateMathLinkFromAuto(file: Tfile): string {
            let templates = settings.templates;
            let baseName =  file.name.replace('\.md', '');
            let mathLink = baseName;
            for (let i = 0; i < templates.length; i++) {
                let replaced;
                if (templates[i].sensitive)
                    replaced = new RegExp(templates[i].replaced, 'g');
                else
                    replaced = new RegExp(templates[i].replaced, 'gi');
                let replacement = templates[i].replacement;

                mathLink = mathLink.replace(replaced, replacement);
            }
            return mathLink;
        }

        // Convert mixed and double links to math links
        function convertToMathLinks(fileName: string, fileContent: string, mathLink: string): string {
            let left = mathLink.replace(/^/, '[').replace(/$/, ']');
            let right = fileName.replace(/^/, '(').replace(/$/, ')').replace(/\s/g, '%20');
            let newLink = `${left}${right}`;

            let mixedLink = new RegExp('\\[((?!\\]\\(|\\]\\]).)*\\]' + format(right), 'g');
            let doubleLink = new RegExp(format(fileName.replace(/^/, '\[\[').replace(/\.md$/, '\]\]')), 'g');

            return fileContent.replace(mixedLink, newLink).replace(doubleLink, newLink);
        }

        // Format str for regex
        function format(str: string): string {
            return str
                .replace(/\s/g, '\\s')
                .replace(/\./g, '\\.')
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)')
                .replace(/\{/g, '\\{')
                .replace(/\}/g, '\\}')
                .replace(/\[/g, '\\[')
                .replace(/\]/g, '\\]');
        }

        // Add settings tab
        this.addSettingTab(new MathLinksSettingTab(this.app, this));
    }

    async onunload() {
        console.log('Unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
