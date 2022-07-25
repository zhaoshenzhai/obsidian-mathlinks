import { App, Plugin, Editor, MarkdownView, TFile } from 'obsidian';

export default class MathLinks extends Plugin {
    async onload() {
        const { vault } = this.app;
        const { workspace } = this.app;
        const { metadataCache } = this.app;
        const { fileManager} = this.app;

        // Update all links in backLinkFiles if file (with mathLink) is changed.
        //     Want to modify it so it runs only if a mathLink is updated/generated.
        // Generate mathLinks of outLinks in file if file  is change.
        //     Want to midify it so it runs only if a link is created.
        metadataCache.on('changed', async (file: TFile, data: string, cache: CachedMetaData) => {
            let mathLink = await getMathLink(file);
            if (mathLink != null && mathLink != undefined) {
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
                            let doubleLink = new RegExp(file.name.replace(/^/, '\\[\\[').replace(/\.md$/, '\\]\\]').replace(/\s/g, '\\s'), 'g');

                            let modified = backLinkFileContent.replace(mixedLink, newLink).replace(doubleLink, newLink);
                            if (backLinkFileContent != modified) {
                                vault.modify(backLinkFile, modified);
                            }
                        }
                    });
                }
            }

            let fileContent = await vault.read(file);
            let modified = fileContent;
            cache.links.forEach(async (outLink) => {
                let outLinkFileName = outLink.link;
                if (outLink.displayText != "")
                    outLinkFileName = outLinkFileName.replace(/$/, '.md');
                let outLinkFilePath = fileManager.getNewFileParent(outLinkFileName).path + '/' + outLinkFileName;
                let outLinkFile = vault.getAbstractFileByPath(outLinkFilePath);

                if (outLinkFile instanceof TFile) {
                    let outLinkMathLink = await getMathLink(outLinkFile);
                    if (outLinkMathLink != null && outLinkMathLink != undefined) {
                        let doubleLink = new RegExp(outLinkFileName.replace(/^/, '\\[\\[').replace(/\.md$/, '\\]\\]').replace(/\s/g, '\\s'), 'g');

                        let left = outLinkMathLink[0].replace(/^/, '[').replace(/$/, ']');
                        let right = outLinkFileName.replace(/^/, '(').replace(/$/, ')').replace(/\s/g, '%20');
                        let newLink = `${left}${right}`;

                        modified = modified.replace(doubleLink, newLink);
                        if (fileContent != modified) {
                            await vault.modify(file, modified);
                        }
                    }
                }
            });
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
