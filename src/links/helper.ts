import { NativeProvider } from './../api/provider';
import { TFile, renderMath, parseLinktext, resolveSubpath, BlockSubpathResult, HeadingSubpathResult } from "obsidian";
import { MathLinksMetadata } from "../api/deprecated";
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

        textFrom = mathPattern.lastIndex;
    }

    if (textFrom < source.length) mathLinkEl.createSpan().replaceWith(source.slice(textFrom));
}

export function getMathLink(plugin: MathLinks, targetLink: string, sourcePath: string, isSourceMode?: boolean): string {
    let { path, subpath } = parseLinktext(targetLink);

    let file = plugin.app.metadataCache.getFirstLinkpathDest(path, sourcePath);
    if (!file) return "";

    let cache = plugin.app.metadataCache.getFileCache(file);
    if (!cache) return "";

    let subpathResult = resolveSubpath(cache, subpath);

    

    const sourceFile = plugin.app.vault.getAbstractFileByPath(sourcePath);
    if (!(sourceFile === null || sourceFile instanceof TFile)) {
        return "";
    }

    let mathLink = "";
    plugin.iterateProviders((provider) => {
        if (isSourceMode && !provider.enableInSourceMode) return;

        const provided = provider.provide({ path, subpath }, file, subpathResult, sourceFile);
        if (provided) {
            if (provider instanceof NativeProvider && subpathResult?.type == 'heading') {
                if (mathLink && provided == (path ? path + ' > ' : '') + subpathResult.current.heading) {
                    return;
                }
            }
            mathLink = provided;
        }
    });

    return mathLink;
}

export function getMathLinkFromSubpath(linkpath: string, subpathResult: HeadingSubpathResult | BlockSubpathResult, metadata: MathLinksMetadata | undefined, blockPrefix: string, prefix: string | null): string {
    let subMathLink = ""
    if (subpathResult.type == "heading") {
        subMathLink = subpathResult.current.heading;
    } else if (subpathResult.type == "block" && metadata?.["mathLink-blocks"]?.[subpathResult.block.id]) {
        subMathLink = blockPrefix + metadata["mathLink-blocks"][subpathResult.block.id];
    }
    if (subMathLink) {
        if (prefix === null) { // use standard prefix
            if (linkpath) {
                return (metadata?.["mathLink"] ?? linkpath) + " > " + subMathLink;
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

export function getMathLinkFromTemplates(plugin: MathLinks, file: TFile): string {
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
