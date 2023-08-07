import { TFile, renderMath, finishRenderMath, parseLinktext, resolveSubpath, getLinkpath, BlockSubpathResult, HeadingSubpathResult } from "obsidian";
import { translateLink } from "./utils"
import MathLinks from "./main";
import { MathLinksMetadata } from "./api";

export function generateMathLinks(plugin: MathLinks, element: HTMLElement, sourcePath: string): void {
    for (let targetEl of element.querySelectorAll<HTMLElement>(".internal-link")) {
        if (targetEl.classList.contains("mathLink-internal-link")) {
            targetEl.remove();
            let queryResult = element.querySelector<HTMLElement>(".original-internal-link");
            if (queryResult) {
                targetEl = queryResult;
                targetEl.classList.remove("original-internal-link");
                targetEl.style.display = "";    
            }
        }

        let targetDisplay = targetEl.textContent?.trim();
        if (targetDisplay != "" && !/math-inline is-loaded/.test(targetEl.innerHTML)) {
            let targetLink = targetEl.getAttribute("data-href")?.replace(/\.md/, "");
            if (targetLink) {
                if (targetDisplay && targetDisplay != targetLink && targetDisplay != translateLink(targetLink)) {
                    addMathLink(targetEl, targetDisplay, true);
                } else {
                    let targetMathLink = getMathLink(plugin, targetLink, sourcePath);
                    if (targetMathLink) {
                        let targetName = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(targetLink), sourcePath)?.basename;
                        if (targetEl.innerText == targetName || targetEl.innerText == translateLink(targetLink)) {
                            addMathLink(targetEl, targetMathLink, true);
                        }
                    }
                }    
            }
        }
    }
}

export function addMathLink(targetEl: HTMLElement, mathLink: string, newElement: boolean): HTMLElement {
    let splits: [string, boolean][] = [];

    let split = "";
    let isMath = false;
    for (let i = 0; i < mathLink.length; i++) {
        let character = mathLink[i];
        if (character == "$") {
            if (split != "") {
                splits.push([split, isMath]);
                split = "";
            }
            isMath = !isMath;
        } else {
            split += character;
        }

        if (i == mathLink.length - 1 && split != "") {
            splits.push([split, isMath]);
        }
    }

    let mathLinkEl = targetEl.cloneNode(newElement) as HTMLElement;
    mathLinkEl.innerText = "";
    for (let i = 0; i < splits.length; i++) {
        let word = splits[i][0];
        if (splits[i][1]) {
            let wordMath = renderMath(word, false);
            let mathEl = mathLinkEl.createSpan();
            mathEl.replaceWith(wordMath);
        } else {
            let wordEl = mathLinkEl.createSpan();
            wordEl.innerText += word;
        }
    }

    finishRenderMath();
    if (newElement) {
        targetEl.parentNode?.insertBefore(mathLinkEl, targetEl.nextSibling);
        mathLinkEl.classList.add("mathLink-internal-link");
        targetEl.classList.add("original-internal-link");
        targetEl.style.display = "none";
    }

    return mathLinkEl;
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
            mathLink = getMathLinkFromSubpath(plugin, path, subpathResult, cache.frontmatter, plugin.settings.blockPrefix, plugin.settings.enableFileNameBlockLinks);
        } else if (path) {
            mathLink = cache.frontmatter.mathLink;
            if (mathLink == "auto") {
                mathLink = getMathLinkFromTemplates(plugin, file);
            }
        }
    }

    // Read mathLink registered via API
    if (!mathLink && plugin.settings.enableAPI) {
        for (let account of plugin.apiAccounts) {
            if (account.metadataSet[file.path]) {
                let metadata = account.metadataSet[file.path];
                if (subpathResult) {
                    mathLink = getMathLinkFromSubpath(plugin, path, subpathResult, metadata, account.blockPrefix, account.enableFileNameBlockLinks);
                } else {
                    mathLink = metadata["mathLink"] ?? "";
                }
            }
            if (mathLink) {
                break;
            }
        }
    }

    return mathLink;
}

function getMathLinkFromSubpath(
    plugin: MathLinks, 
    linkpath: string, 
    subpathResult: HeadingSubpathResult | BlockSubpathResult, 
    metadata: MathLinksMetadata, 
    blockPrefix: string, 
    enableFileNameBlockLinks: boolean,
): string {
    let subMathLink = ""
    if (subpathResult.type == "heading") {
        subMathLink = subpathResult.current.heading;
    } else if (subpathResult.type == "block" && metadata["mathLink-blocks"] && metadata["mathLink-blocks"][subpathResult.block.id]) {
        subMathLink = blockPrefix + metadata["mathLink-blocks"][subpathResult.block.id];
    }
    if (subMathLink) {
        if (linkpath && enableFileNameBlockLinks) {
            return (metadata["mathLink"] ?? linkpath) + " > " + subMathLink;
        } else { 
            return subMathLink;
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
