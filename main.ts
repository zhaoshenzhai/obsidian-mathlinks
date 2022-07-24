import { App, Plugin, Editor, MarkdownView, TFile } from 'obsidian';

export default class MathLinks extends Plugin {
    async onload() {
        const { vault } = this.app;
        const { workspace } = this.app;
        const { metadataCache } = this.app;

        // Update all links in backLinkFiles if file (with mathLink) is changed.
        // Want to modify it so it runs only if a mathLink is updated/generated.
        metadataCache.on('changed', async (file: TFile, data: string, cache: CachedMetaData) => {
            console.log(file.name);
            let mathLink = await getMathLink(file);
            if (mathLink != null) {
                let backLinkFilePaths: string[] = [];
                Object.keys(metadataCache.resolvedLinks).forEach((key) => {
                    let links = metadataCache.resolvedLinks[key];
                    Object.keys(links).forEach((link) => {
                        if (link === file.path) {
                            backLinkFilePaths.push(key);
                        }
                    });
                });

                if (backLinkFilePaths.length != 0) {
                    backLinkFilePaths.forEach(async (backLinkFilePath) => {
                        let backLinkFile = vault.getAbstractFileByPath(backLinkFilePath);
                        if (backLinkFile instanceof TFile) {
                            let backLinkFileContent = await vault.read(backLinkFile);

                            let left = mathLink[0].replace(/^/, '[').replace(/$/, ']');
                            let right = file.name.replace(/^/, '(').replace(/$/, ')').replace(/\s/g, '%20');
                            let newLink = `${left}${right}`

                            let rightFormatted = right.replace(/\./, '\\.').replace(/\(/, '\\(').replace(/\)/, '\\)').replace(/\%/, '\\%');
                            let mixedLink = new RegExp('\\[((?!\\]\\(|\\]\\]).)*\\]' + rightFormatted, 'g');
                            let doubleLink = new RegExp(file.name.replace(/^/, '\\[\\[').replace(/\.md$/, '\\]\\]').replace(/\s/, '\\s'), 'g');

                            let modified = backLinkFileContent.replace(mixedLink, newLink).replace(doubleLink, newLink);
                            if (backLinkFileContent != modified) {
                                vault.modify(backLinkFile, modified);
                            }
                        }
                    });
                }
            }
        });

        // Get mathLink as string (with lineNumber). If key exists but not value, return null (with lineNumber). Undefined otherwise.
        async function getMathLink(file?: TFile): [string, number] | [null, number] | undefined {
            let contents = [];
            if (file != null) {
                contents = await vault.read(file);
                contents = contents.split(/\r?\n/);
            } else {
                const editor = workspace.getActiveViewOfType(MarkdownView).editor;
                for (let i = 0; i < editor.lineCount(); i++) {
                    contents.push(editor.getLine(i));
                }
            }

            if (contents[0] === '---') {
                for (let lineNumber = 1; lineNumber < contents.length; lineNumber++) {
                    let line = contents[lineNumber];
                    if (line.length < 10) {
                        lineNumber++;
                    } else {
                        let key = line.substring(0, 10);
                        if (key === 'mathLink: ') {
                            let value = line.replace(key, '');
                            if (value != '')
                                return [value, lineNumber];
                            else
                                return [null, lineNumber];
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
    }

    async onunload() {
        console.log('Unloaded');
    }
}
