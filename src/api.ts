import { App, TFile } from 'obsidian';

import MathLinks, { MathLinksMetadata, MathLinksMetadataSet } from './main';

export class MathLinksAPI {
    metadataSet: MathLinksMetadataSet;

    constructor(public plugin: MathLinks, public userID: string, public blockPrefix: string) {
        if (this.plugin.mathLinksFromAPI[userID] !== undefined) {
            throw Error(`MathLinks API: user ID ${userID} is already taken`);
        }
        this.plugin.mathLinksFromAPI[userID] = {};
        this.metadataSet = this.plugin.mathLinksFromAPI[userID];
    }

    update(path: string, newMetadata: MathLinksMetadata) {
        let file = this.plugin.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile && file.extension == "md") {
            this.metadataSet[path] = Object.assign(
                {},
                this.metadataSet[path],
                newMetadata
            );
        } else {
            throw Error(`MathLinks API: Invalid path: ${path}`);
        }
    }

    get(path: string, blockID?: string) {
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

    delete(path: string, which?: string) {
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

    deleteUser() {
        delete this.plugin.mathLinksFromAPI[this.userID];
    }
}
