import { App, Plugin, Editor, MarkdownView, TFile } from 'obsidian';

export default class MathLinks extends Plugin {
    async onload() {
        const { vault } = this.app;
        const { workspace } = this.app;
        const { metadataCache } = this.app;
        const { fileManager } = this.app;

        // Command to add mathLink. Only available if there is no mathLink
        this.addCommand({
            id: 'add-mathlink',
            name: 'Add a MathLink to the current file',
            checkCallback: (checking: boolean) => {
                const view = workspace.getActiveViewOfType(MarkdownView);
                if (view) {
                    let currentFile = workspace.getActiveFile();
                    let mathLink = getMathLink();
                    if (mathLink === undefined || mathLink[0] === null) {
                        if (!checking) {
                            let editor = view.editor;
                            let frontMatter = getFrontMatter();
                            // If no frontMatter
                            if (frontMatter === undefined) {
                                // Write frontMatter and focus
                                editor.replaceRange('---\n', {line: 0, ch: 0})
                                editor.replaceRange('mathLink: \n', {line: 1, ch: 0})
                                editor.replaceRange('---\n', {line: 2, ch: 0})
                                editor.setCursor(1);
                                editor.focus();
                            } else {
                                // Change to edit mode
                                let currentState = workspace.getLeaf().getViewState();
                                currentState.state.mode = 'source';
                                workspace.getLeaf(false).setViewState(currentState);

                                // If no mathLink
                                if (mathLink === undefined) {
                                    // Add mathLink key and focus
                                    let lineToAppendTo = frontMatter[1].to.line - 1;
                                    editor.setLine(lineToAppendTo, editor.getLine(lineToAppendTo) + '\nmathLink: ');
                                    editor.setCursor(lineToAppendTo + 1);
                                    editor.focus();
                                } else {
                                    // Move to mathLink line and focus
                                    editor.setCursor(mathLink[1], editor.getLine(mathLink[1]));
                                    editor.focus();
                                }
                            }
                        }
                        return true;
                    }
                }
                return false;
            }
        });

        // Command to edit mathLink. Only available if mathLink exists
        this.addCommand({
            id: 'edit-mathlink',
            name: 'Edit the MathLink of the current file',
            checkCallback: (checking: boolean) => {
                const view = workspace.getActiveViewOfType(MarkdownView);
                if (view) {
                    let mathLink = getMathLink();
                    if (mathLink != undefined) {
                        if (typeof mathLink[0] === 'string') {
                            if (!checking) {
                                // Change to edit mode
                                let currentState = workspace.getLeaf().getViewState();
                                currentState.state.mode = 'source';
                                workspace.getLeaf(false).setViewState(currentState);

                                // Select mathLink to edit
                                view.editor.setSelection({line: mathLink[1], ch: 10}, {line: mathLink[1], ch: view.editor.getLine(mathLink[1])});
                                view.editor.focus();
                            }
                            return true;
                        }                       
                    }
                }
                return false;
            }
        });

        // Get frontMatter as string[] and EditorRange. Undefined otherwise.
        function getFrontMatter(): [string[], EditorRange] | undefined {
            const editor = workspace.getActiveViewOfType(MarkdownView).editor;
            if (editor.getLine(0) === '---') {
                let lineNumber = 1;
                let lineCount = editor.lineCount();
                let lines: string[] = ['---'];
                while (true) {
                    let line = editor.getLine(lineNumber);
                    lines.push(line);
                    if (line === '---') {
                        return [lines, {from: {line: 0, col: 0}, to: {line: lineNumber, col: 3}}];
                    } else if (lineNumber > lineCount ) {
                        return undefined;
                    } else {
                        lineNumber++;
                    }
                }
            }
            return undefined;
        }

        // Get mathLink as string (with lineNumber). If key exists but not value, return null (with lineNumber). Undefined otherwise.
        function getMathLink(): [string, number] | [null, number] | undefined {
            const editor = workspace.getActiveViewOfType(MarkdownView).editor;
            if (editor.getLine(0) === '---') {
                let lineNumber = 1;
                while (true) {
                    let line = editor.getLine(lineNumber);
                    let key = line.substring(0, 10);
                    let value = line.replace(key, '');
                    if (key === 'mathLink: ') {
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
            return undefined;
        }

        // Runs when file is change
        // Ideally, I want to run it when a link is added/new mathLink is created
        // Will need to look into it...
        metadataCache.on('changed', (file: TFile, data: string, cache: CachedMetaData) => {
            // Get (out)links; run if non-empty
            let links = cache.links;
            if (Array.isArray(links)) {
                // Loop through all links
                links.forEach((link) => {
                    // Get path of file
                    let linkPath = fileManager.getNewFileParent(link.link).path;

                    // Get file
                    let linkFile;
                    if (isDisplayLink(link))
                        linkFile = vault.getAbstractFileByPath(linkPath + '/' + link.link);
                    else
                        linkFile = vault.getAbstractFileByPath(linkPath + '/' + link.link + '.md');

                    // If it is a file
                    if (linkFile instanceof TFile) {
                        // Get frontMatter
                        let frontMatter = metadataCache.getFileCache(linkFile).frontmatter;
                        if (frontMatter != undefined) {
                            // Get mathLink
                            let mathLink = frontMatter.mathLink;
                            if (mathLink != undefined && mathLink != null) {
                                let startPos = {line: link.position.start.line, ch: link.position.start.col};
                                let endPos = {line: link.position.end.line, ch: link.position.end.col};
                                // Update if already exists; new otherwise
                                if (isDisplayLink(link)) {
                                    let current = link.original.replace(/\[/, '')
                                        .replace(/\]\(([^\$^\[^\]]+%20)+[^\$^\[^\]]*(\.md)*\)/, '');
                                    if (current != mathLink) {
                                        let leftOver = link.original.replace(current, '').replace('[]', '');
                                        updateMathLink(mathLink, startPos, endPos, leftOver);
                                    }
                                } else {
                                    let obsidianFormatted = link.link.replace(/^/, '(').replace(/$/, '.md)').replace(/\s/g, '%20');
                                    newMathLink(mathLink, startPos, endPos, obsidianFormatted);
                                }
                            }
                        }
                    }
                });
            }

            console.log('Backlinks');
            let resolvedLinks = metadataCache.resolvedLinks;
            let keys = Object.keys(resolvedLinks);
            keys.forEach((key) => {
                let links = resolvedLinks[key];
                Object.keys(links).forEach((link) => {
                    if (link === file.path) {
                        console.log(key);
                        console.log(metadataCache.getFirstLinkpathDest(key, key));
                    }
                });
            });
        });

        function updateMathLink(mathLink: string, startPos: EditorPosition, endPos: EditorPosition, leftOver: string): void {
            const view = workspace.getActiveViewOfType(MarkdownView);
            startPos.ch++;
            endPos.ch = endPos.ch - leftOver.length - 1;
            view.editor.replaceRange(mathLink, startPos, endPos);
        }

        function newMathLink(mathLink: string, startPos: EditorPosition, endPos: EditorPosition, obsidianFormatted: string): void {
            const view = workspace.getActiveViewOfType(MarkdownView);
            let replaceBy = `[${mathLink}]${obsidianFormatted}`
            view.editor.replaceRange(replaceBy, startPos, endPos);
        }

        function isDisplayLink(link: LinkCache): boolean {
            return link.displayText === "";
        }
    }

    async onunload() {
        console.log('Unloaded');
    }
}
