import { TFile, renderMath, finishRenderMath, parseLinktext, resolveSubpath, BlockSubpathResult, HeadingSubpathResult } from "obsidian";
import { MathLinksMetadata } from "../api/api";
import MathLinks from "../main";

export function setMathLink(source: string, mathLinkEl: HTMLElement) {
    mathLinkEl.replaceChildren();
    const mathPattern = /\$(.*?[^\s])\$/g;
    let textFrom = 0, textTo = 0;
    let result;
    while ((result = mathPattern.exec(source)) !== null) {
        const mathString = result[1];
        textTo = result.index;
        if (textTo > textFrom) mathLinkEl.createSpan().replaceWith(source.slice(textFrom, textTo));

        const mathEl = renderMath(mathString, false);
        mathLinkEl.createSpan({ cls: ["math", "math-inline", "is-loaded"] }).replaceWith(mathEl);
        finishRenderMath();

        textFrom = mathPattern.lastIndex;
    }

    if (textFrom < source.length) mathLinkEl.createSpan().replaceWith(source.slice(textFrom));
}

export function getMathLink(plugin: MathLinks, targetLink: string, sourcePath: string): string {
    let { path, subpath } = parseLinktext(targetLink);

    let file = plugin.app.metadataCache.getFirstLinkpathDest(path, sourcePath);
    if (!file) return "";

    let cache = plugin.app.metadataCache.getFileCache(file);
    if (!cache) return "";

    let subpathResult = resolveSubpath(cache, subpath);

    let mathLink = "";
    if (cache.frontmatter) {
        if (subpathResult) {
            mathLink = getMathLinkFromSubpath(path, subpathResult, cache.frontmatter, plugin.settings.blockPrefix, 
                // If enableFileNameBlockLinks == true, pass `null` to the last parameter `prefix`, which means using the standard prefix (e.g. note > block). 
                // Otherwise, pass an empty string to `prefix`, which means using no prefix (no prefix is a special case of custom prefixes).
                plugin.settings.enableFileNameBlockLinks ? null : ""
            );
        } else if (path) {
            mathLink = cache.frontmatter.mathLink;
            if (mathLink == "auto") {
                mathLink = getMathLinkFromTemplates(plugin, file);
            }
        }
    }

    if (!mathLink && plugin.settings.enableAPI) {
        const sourceFile = plugin.app.vault.getAbstractFileByPath(sourcePath);
        if (sourceFile instanceof TFile) {
            for (let account of plugin.apiAccounts) {
                const metadata = account.metadataSet.get(file);
                if (metadata) {
                    if (subpathResult) {
                        mathLink = getMathLinkFromSubpath(path, subpathResult, metadata, account.blockPrefix, 
                            // An API user can specify custom prefixes depending on the source file (sourceFile) & the target file (file).
                            account.prefixer(sourceFile, file)
                        );
                    } else {
                        mathLink = metadata["mathLink"] ?? "";
                    }
                }
                if (mathLink) {
                    break;
                }
            }    
        }
    }

    return mathLink;
}

function getMathLinkFromSubpath(linkpath: string, subpathResult: HeadingSubpathResult | BlockSubpathResult, metadata: MathLinksMetadata, blockPrefix: string, prefix: string | null): string {
    let subMathLink = ""
    if (subpathResult.type == "heading") {
        subMathLink = subpathResult.current.heading;
    } else if (subpathResult.type == "block" && metadata["mathLink-blocks"] && metadata["mathLink-blocks"][subpathResult.block.id]) {
        subMathLink = blockPrefix + metadata["mathLink-blocks"][subpathResult.block.id];
    }
    if (subMathLink) {
        if (prefix === null) { // use standard prefix
            if (linkpath) {
                return (metadata["mathLink"] ?? linkpath) + " > " + subMathLink;    
            } else {
                return subMathLink;    
            }
        } else { // typeof prefix == 'string' => use custom prefix 
            return prefix + subMathLink;
        }
    } else {
        return "";
    }
}

function getMathLinkFromTemplates(plugin: MathLinks, file: TFile): string {
    let templates = plugin.settings.templates;
    let mathLink = file.name.replace(/\.md$/, "");
    for (let i = 0; i < templates.length; i++) {
        let replaced = new RegExp(templates[i].replaced);
        let replacement = templates[i].replacement;

        let flags = "";
        if (templates[i].globalMatch) flags += "g";
        if (!templates[i].sensitive) flags += "i";

        if (templates[i].word)
            replaced = RegExp(replaced.source.replace(/^/, "\\b").replace(/$/, "\\b"), flags);
        else
            replaced = RegExp(replaced.source, flags);

        mathLink = mathLink.replace(replaced, replacement);
    }

    return mathLink;
}
