import { App, TFile } from 'obsidian';

import MathLinks, { MathLinksMetadata } from './main';

export class MathLinksAPI {
    constructor(public plugin: MathLinks) { }

    checkIfEnabled() {
        if (!this.plugin.settings.enableAPI) {
            throw Error("MathLinks: MathLinks API is disabled");
        }
    }

    update(path: string, newMetadata: MathLinksMetadata) {
        this.checkIfEnabled();
        let file = this.plugin.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile && file.extension == "md") {
            this.plugin.externalMathLinks[path] = Object.assign(
                {}, 
                this.plugin.externalMathLinks[path],
                newMetadata
            );    
        } else {
            throw Error(`MathLinks API: Invalid path: ${path}`);
        }
    }

    delete(path: string, which?: string) {
        // `which === undefined`: remove all the external mathLinks associated with `path`
        // `which == "mathLink": remove `mathLink`
        // `which == "mathLink-blocks": remove `mathLink-blocks`
        // `which == <blockID>`: remove `mathLink-blocks[<blockID>]`
        this.checkIfEnabled();
        let metadata = this.plugin.externalMathLinks[path]
        if (metadata) {
            if (which === undefined) {
                delete this.plugin.externalMathLinks[path];
            } else if (which == "mathLink" || which == "mathLink-blocks") {
                if (metadata[which] !== undefined) {
                    delete metadata[which];
                } else {
                    throw Error(`MathLinks API: Key "${which}" does not exist in MathLinks.externalMathLinks[${path}]`);
                }
            } else {
                let blocks = metadata["mathLink-blocks"];
                if (blocks && blocks[which] !== undefined) {
                    delete blocks[which];
                } else {
                    throw Error(`MathLinks API: Block ID "${which}" does not exist in MathLinks.externalMathLinks[${path}]["mathLink-blocks"]`);
                }
            }
        } else {
            throw Error(`MathLinks API: Path ${path} does not exist in MathLinks.externalMathLinks`);
        }
    }
}
