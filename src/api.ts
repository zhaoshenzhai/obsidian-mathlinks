import { MarkdownView, PluginManifest, TFile, WorkspaceLeaf } from 'obsidian';
import MathLinks from './main';

export interface MathLinksMetadata {
    "mathLink"?: string;
    "mathLink-blocks"?: Record<string, string>
}

export type MathLinksMetadataSet = Record<string, MathLinksMetadata>; // {[path]: [metadata for the file], ...}

export class MathLinksAPIAccount {
    metadataSet: MathLinksMetadataSet;

    constructor(
        public plugin: MathLinks,
        public manifest: Readonly<PluginManifest>,
        public blockPrefix: string,
        public enableFileNameBlockLinks: boolean,
    ) {
        this.metadataSet = {};
    }

    update(path: string, newMetadata: MathLinksMetadata): void {
        let file = this.plugin.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile && file.extension == "md") {
            this.metadataSet[path] = Object.assign(
                {},
                this.metadataSet[path],
                newMetadata
            );
            // reflesh mathLinks display based on the new metadata
            this.plugin.app.workspace.iterateRootLeaves((leaf: WorkspaceLeaf) => {
                if (leaf.view instanceof MarkdownView) {
                    if (leaf.view.getMode() == 'source') {
                        leaf.view.editor.cm?.dispatch(); // call ViewPlugin's update() method
                    }
                    /** commented out because this resets page position */
                    //  else if (leaf.view.getMode() == 'preview') {
                    //     leaf.view.previewMode.rerender(true); 
                    // }
                }
            });
        } else {
            throw Error(`MathLinks API: Invalid path: ${path}`);
        }
    }

    get(path: string, blockID?: string): string | undefined {
        // If blockID === undefined, return mathLink
        // If blockID is given, return the corresponding item of mathLink-blocks
        let metadata = this.metadataSet[path];
        if (metadata) {
            if (blockID === undefined) {
                return metadata["mathLink"];
            }
            let blocks = metadata["mathLink-blocks"];
            if (blocks) {
                return blocks[blockID];
            }
        }
    }

    delete(path: string, which?: string): void {
        // `which === undefined`: remove all the mathLinks associated with `path`
        // `which == "mathLink": remove `mathLink`
        // `which == "mathLink-blocks": remove `mathLink-blocks`
        // `which == <blockID>`: remove `mathLink-blocks[<blockID>]`
        let metadata = this.metadataSet[path];
        if (metadata) {
            if (which === undefined) {
                delete this.metadataSet[path];
            } else if (which == "mathLink" || which == "mathLink-blocks") {
                if (metadata[which] !== undefined) {
                    delete metadata[which];
                } else {
                    throw Error(`MathLinks API: MathLinksMetadata of type "${which}" does not exist for ${path}`);
                }
            } else {
                let blocks = metadata["mathLink-blocks"];
                if (blocks && blocks[which] !== undefined) {
                    delete blocks[which];
                } else {
                    throw Error(`MathLinks API: MathLinksMetadata for ${path}#^${which}" does not exist`);
                }
            }
        } else {
            throw Error(`MathLinks API: MathLinksMetadata for ${path} does not exist`);
        }
    }

    deleteAccount(): void {
        let index = this.plugin.apiAccounts.findIndex(
            (account) => account.manifest.id == this.manifest.id
        );
        this.plugin.apiAccounts.splice(index, 1);
    }
}
