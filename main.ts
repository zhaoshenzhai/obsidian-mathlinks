import { App, Plugin, Editor, MarkdownView, TFile } from 'obsidian';

export default class MathLinks extends Plugin {
	async onload() {
        const { vault } = this.app;
        const { workspace } = this.app;
        const { metadataCache } = this.app;
        const { fileManager } = this.app;

        // Command to add mathLink
        // Only available if there is no mathLink
		this.addCommand({
			id: 'add-mathlink',
			name: 'Add a MathLink to the current file',
			checkCallback: (checking: boolean) => {
                const view = workspace.getActiveViewOfType(MarkdownView);
				if (view) {
                    let yaml = getYaml(workspace.getActiveFile());
                    if (!(yaml instanceof Array)) {
                        console.log('Add ' + yaml);
                        if (!checking) {
                            let editor = view.editor;
                            if (yaml === null) { // Add mathLink if yaml: null
                                // Continue here
                            } else { // Add mathLink if yaml: EditorRange
                                // Change to edit mode
                                let currentState = workspace.getLeaf().getViewState();
                                currentState.state.mode = 'source';
                                workspace.getLeaf(false).setViewState(currentState);

                                // Add 'mathLink: ' and focus cursor
                                let lineToAppendTo = yaml.to.line - 1;
                                editor.setLine(lineToAppendTo, editor.getLine(lineToAppendTo) + '\nmathLink: ');
                                editor.setCursor(yaml.to.line);
                                editor.focus();
                            }
                        }
                        return true;
                    }
				}
                return false;
			}
		});

        // Command to edit mathLink
        // Only available if mathLink exists
		this.addCommand({
			id: 'edit-mathlink',
			name: 'Edit the MathLink of the current file',
			checkCallback: (checking: boolean) => {
                const view = workspace.getActiveViewOfType(MarkdownView);
				if (view) {
                    let yaml = getYaml(workspace.getActiveFile());
                    if (yaml instanceof Array) {
                        console.log('Edit ' + yaml);
                        if (!checking) {
                            // Edit mathLink (yaml: [string, EditorRange])
                            // new EditMathLink(this.app, (mathLink: string) => {
                            //     new Notice('MathLink edited');
                            // }).open();
                        }
                        return true;
                    }
				}
                return false;
			}
		});

        function getYaml(file: TFile): [string, EditorRange] | EditorRange | null {
            // Get YAML frontmatter
            let yaml = metadataCache.getFileCache(file).frontmatter;

            // If no frontmatter, return null
            if (yaml === undefined)
                return null;
            else {
                // Get frontmatter range
                let yamlRange: EditorRange = {from: yaml.position.start, to: yaml.position.end};
                // Return range if no mathlink
                if (yaml.mathLink === undefined) {
                    return yamlRange;
                // Return mathLink if it exists
                } else
                    return [yaml.mathLink, yamlRange];
            }
        }

        metadataCache.on('changed', (file: TFile, data: string, cache: CachedMetaData) => {
            // Get links; run if non-empty
            let links = cache.links;
            if (Array.isArray(links)) {
                console.log('All MathLinks of ' + file.name + ':');
                // Loop through all links
                links.forEach((link) => {
                    // Get path of file
                    let linkPath = fileManager.getNewFileParent(link.link).path;
                    // Get file
                    let linkFile;
                    if (isMathLink(link))
                        linkFile = vault.getAbstractFileByPath(linkPath + '/' + link.link);
                    else
                        linkFile = vault.getAbstractFileByPath(linkPath + '/' + link.link + '.md');

                    // If it is a file
                    if (linkFile instanceof TFile) {
                        // Get YAML
                        let mathLink = getYaml(linkFile);
                        // If mathLink exists
                        if (mathLink instanceof Array) {
                            console.log(link, mathLink);
                            // Get start and end positions of link
                            let startPos = {line: link.position.start.line, ch: link.position.start.col};
                            let endPos = {line: link.position.end.line, ch: link.position.end.col};

                            // Update if already exists; new otherwise
                            if (isMathLink(link))
                                updateMathLink(mathLink[0], startPos, endPos);
                            else
                                newMathLink(mathLink[0], startPos, endPos);
                        }
                    }
                });
            }
        });

        function isMathLink(link: LinkCache): boolean {
            return link.displayText === "";
        }

        function updateMathLink(mathLink: string, startPos: number, endPos: number): void {
            console.log('Update');
            // const view = workspace.getActiveViewOfType(MarkdownView);
            // view.editor.replaceRange(mathLink, startPos, endPos);
        }

        function newMathLink(mathLink: string, startPos: number, endPos: number): void {
            console.log('New');
            // const view = workspace.getActiveViewOfType(MarkdownView);
            // view.editor.replaceRange(mathLink, startPos, endPos);
        }
    }

	async onunload() {
        console.log('Unloaded');
	}
}
