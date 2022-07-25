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
                            let modified = generateMathLinks(file.name, backLinkFileContent, mathLink[0]);

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
                            modified = generateMathLinks(outLinkFileName, modified, outLinkMathLink[0]);

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

        // Generate mathLink from 'mathLink: auto' and file.name
        async function generateMathLinkFromAuto(file: Tfile): string {
            return file.name.replace('\.md', '')
                .replace(/\bn-\b/g, '$n$-'                                      ) // n prefix
                .replace(/\bR\b/g, '$\\R$'                                      ) // Real numbers
                .replace(/\bN\b/g, '$\\N$'                                      ) // Natural numbers
                .replace(/\bR2\b/g, '$\\R\\^2$'                                 ) // Real numbers squared
                .replace(/\bN2\b/g, '$\\N\\^2$'                                 ) // Natural numbers squared
                .replace(/\bequals\b/g, '$=$'                                   ) // Equals
                .replace(/\bimplies\b/g, '$\\Rightarrow$'                       ) // Implies
                .replace(/\biff\b/g, '$\\Leftrightarrow$'                       ) // Equivalence
                .replace(/\bON\b/g, '$\textrm{ON}$'                             ) // Class of ordinals
                .replace(/\bK\b/g, '$K$'                                        ) // K topology
                .replace(/\sslash\s/g, '$\\slash$'                              ) // Slash
                .replace(/\bCategory\sof\sSets\b/gi, '$\\catset$'               ) // Category of Sets
                .replace(/\bCategory\sof\sRelations\b/gi, '$\\catrel$'          ) // Category of Relations
                .replace(/\bCategory\sof\sVector\sSpaces\b/gi, '$\\catvect[K]$' ) // Category of Vector Spaces ov
                .replace(/\brepr\sunder\sbasis\b/g, '$\\Leftrightarrow^\\textrm{repr.}_\\textrm{bases}$');
                                                                         // represented by/represents under a choice of basis
        }

        // Convert mixed and double links to math links
        function generateMathLinks(fileName: string, fileContent: string, mathLink: string): string {
            let left = mathLink.replace(/^/, '[').replace(/$/, ']');
            let right = fileName.replace(/^/, '(').replace(/$/, ')').replace(/\s/g, '%20');
            let newLink = `${left}${right}`;

            let mixedLink = new RegExp('\\[((?!\\]\\(|\\]\\]).)*\\]' + format(right), 'g');
            let doubleLink = new RegExp(format(fileName.replace(/^/, '\\[\\[').replace(/\.md$/, '\\]\\]')), 'g');

            return fileContent.replace(mixedLink, newLink).replace(doubleLink, newLink);
        }

        // Format str for regex
        function format(str: string): string {
            return str
                .replace(/\s/g, '\\s')
                .replace(/\./g, '\\.')
                .replace(/\(/g, '\\(')
                .replace(/\)/g, '\\)');
        }
    }

    async onunload() {
        console.log('Unloaded');
    }
}
