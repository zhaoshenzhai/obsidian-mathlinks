import { MathLinksAPIAccount, informChange } from './api';
import { BlockSubpathResult, Component, HeadingSubpathResult, TFile } from 'obsidian';
import { getMathLinkFromSubpath, getMathLinkFromTemplates } from '../links/helper';
import MathLinks from '../main';

/**
 * A class that provides a displayed text for a given link.
 */
export abstract class Provider extends Component {
    constructor(public mathLinks: MathLinks) {
        super();
    }

    public abstract provide(
        parsedLinktext: { path: string, subpath: string },
        targetFile: TFile | null,
        targetSubpathResult: HeadingSubpathResult | BlockSubpathResult | null,
        sourceFile: TFile
    ): string | null;

    onunload() {
        const providers = this.mathLinks.providers;
        let index = providers.findIndex(({ provider }) => provider === this);
        providers.splice(index, 1);
        informChange(this.mathLinks.app, "mathlinks:update-all");
    }
}

export class NativeProvider extends Provider {
    public provide(
        parsedLinktext: { path: string, subpath: string },
        targetFile: TFile | null,
        targetSubpathResult: HeadingSubpathResult | BlockSubpathResult | null,
        sourceFile: TFile
    ): string | null {
        const { mathLinks } = this;
        const { app } = mathLinks;

        if (!targetFile) return null;

        let cache = app.metadataCache.getFileCache(targetFile);
        if (!cache) return null;

        let mathLink: string | null = null;
        if (targetSubpathResult) {
            mathLink = getMathLinkFromSubpath(parsedLinktext.path, targetSubpathResult, cache.frontmatter, mathLinks.settings.blockPrefix,
                // If enableFileNameBlockLinks == true, pass `null` to the last parameter `prefix`, which means using the standard prefix (e.g. note > block). 
                // Otherwise, pass an empty string to `prefix`, which means using no prefix (no prefix is a special case of custom prefixes).
                mathLinks.settings.enableFileNameBlockLinks ? null : ""
            );
        } else if (parsedLinktext.path) {
            mathLink = cache.frontmatter?.mathLink;
            if (mathLink == "auto") {
                mathLink = getMathLinkFromTemplates(mathLinks, targetFile);
            }
        }

        return mathLink;
    }
}

/**
 * Provider for preserving backward compatibility with the deprecated API.
 */
export class DeprecatedAPIProvider extends Provider {
    constructor(public account: MathLinksAPIAccount) {
        super(account.plugin);
    }

    public provide(
        parsedLinktext: { path: string, subpath: string },
        targetFile: TFile | null,
        targetSubpathResult: HeadingSubpathResult | BlockSubpathResult | null,
        sourceFile: TFile
    ): string | null {
        if (targetFile === null) {
            return null;
        }

        let mathLink: string | null = null;
        const metadata = this.account.metadataSet.get(targetFile);
        if (metadata) {
            if (targetSubpathResult) {
                mathLink = getMathLinkFromSubpath(parsedLinktext.path, targetSubpathResult, metadata, this.account.blockPrefix,
                    // An API user can specify custom prefixes depending on the source file (sourceFile) & the target file (file).
                    this.account.prefixer(sourceFile, targetFile, targetSubpathResult)
                );
            } else {
                mathLink = metadata["mathLink"] ?? null;
            }
        }

        return mathLink;
    }
}
