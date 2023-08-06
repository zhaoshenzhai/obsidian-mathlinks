import { TFile, renderMath, finishRenderMath, parseLinktext, resolveSubpath, getLinkpath, BlockSubpathResult, HeadingSubpathResult } from "obsidian";
import MathLinks from "./main";

// Generate all mathLinks in element to be added in the MarkdownPostProcessor in reading view
export function generateMathLinks(plugin: MathLinks, element: HTMLElement, sourcePath: string): void {
    for (let targetEl of element.querySelectorAll(".internal-link")) {
        if (targetEl.classList.contains("mathLink-internal-link")) {
            targetEl.remove();
            targetEl = element.querySelector(".original-internal-link");
            targetEl.classList.remove("original-internal-link");
            targetEl.style.display = "";
        }

        let targetDisplay = targetEl.textContent.trim();
        if (targetDisplay != "" && !/math-inline is-loaded/.test(targetEl.innerHTML)) {
            let targetLink = targetEl.getAttribute("data-href").replace(/\.md/, "");
            if (targetDisplay != targetLink && targetDisplay != translateLink(targetLink)) {
                addMathLink(targetEl, targetDisplay, true);
            } else {
                let targetMathLink = getMathLink(plugin, targetLink, sourcePath);
                if (targetMathLink) {
                    let targetName = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(targetLink), sourcePath).basename;
                    if (targetEl.innerText == targetName || targetEl.innerText == translateLink(targetLink)) {
                        addMathLink(targetEl, targetMathLink, true);
                    }
                }
            }
        }
    }
}

// Add a mathLink to targetEl. If newElement, then targetEl will be duplicated.
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

    let mathLinkEl = targetEl.cloneNode(newElement);
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
        targetEl.parentNode.insertBefore(mathLinkEl, targetEl.nextSibling);
        mathLinkEl.classList.add("mathLink-internal-link");
        targetEl.classList.add("original-internal-link");
        targetEl.style.display = "none";
    }

    return mathLinkEl;
}

// Get mathLink from cached metadata
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
            mathLink = getMathLinkFromSubpath(path, subpathResult, cache.frontmatter, "^");
        } else {
            mathLink = cache.frontmatter.mathLink;
            if (mathLink == "auto") {
                let templates = plugin.settings.templates;
                mathLink = file.name.replace("\.md", "");
                for (let i = 0; i < templates.length; i++) {
                    let replaced = new RegExp(templates[i].replaced);
                    let replacement = templates[i].replacement;

                    let flags = "";
                    if (templates[i].globalMatch)
                        flags += "g";
                    if (!templates[i].sensitive)
                        flags += "i";

                    if (templates[i].word)
                        replaced = RegExp(replaced.source.replace(/^/, "\\b").replace(/$/, "\\b"), flags);
                    else
                        replaced = RegExp(replaced.source, flags);

                    mathLink = mathLink.replace(replaced, replacement);
                }
            }
        }
    }

    // Read mathLink registered via API
    if (!mathLink && plugin.settings.enableAPI) {
        for (let account of plugin.apiAccounts) {
            if (account.metadataSet[file.path]) {
                let metadata = account.metadataSet[file.path];
                if (subpathResult) {
                    mathLink = getMathLinkFromSubpath(path, subpathResult, metadata, account.blockPrefix);
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
    linkpath: string, 
    subpathResult: HeadingSubpathResult | BlockSubpathResult, 
    metadata: Object, 
    blockPrefix: string, // originally "^"
): string {
    let subMathLink = ""
    if (subpathResult.type == "heading") {
        subMathLink = subpathResult.current.heading;
    } else if (subpathResult.type == "block" && metadata["mathLink-blocks"] && metadata["mathLink-blocks"][subpathResult.block.id]) {
        subMathLink = blockPrefix + metadata["mathLink-blocks"][subpathResult.block.id];
    }
    if (subMathLink) {
        if (linkpath) { 
            return (metadata["mathLink"] ?? linkpath) + " > " + subMathLink;
        } else { 
            return subMathLink;
        }    
    } else {
        return "";
    }
}

export function getSuperCharged(plugin: MathLinks, file: TFile): [string, [string, string][]] {
    const data = app.plugins.getPlugin("supercharged-links-obsidian").settings;

    let tagArr = plugin.app.metadataCache.getFileCache(file).tags;
    let tags: string = "";
    if (tagArr) {
        for (let i = 0; i < tagArr.length; i++)
            tags += tagArr[i].tag.replace(/#/, "") + " ";
        tags = tags.trimEnd();
    }

    let attributes: [string, string][] = [];
    let frontmatter = plugin.app.metadataCache.getFileCache(file).frontmatter;
    for (let attr in frontmatter) {
        if (attr != "mathLink" && attr != "position") {
            for (let i = 0; i < data.selectors.length; i++) {
                if (data.selectors[i].name == attr && data.selectors[i].value == frontmatter[attr]) {
                    attributes.push([attr, frontmatter[attr]]);
                } else if (data.selectors[i].type == "tag" && data.selectors[i].value == frontmatter[attr] && data.targetTags) {
                    attributes.push([attr, frontmatter[attr]]);
                }
            }
        }
    }

    return [tags, attributes];
}

// Exclude files; include all canvases
export function isValid(plugin: MathLinks, element: HTMLElement, fileName: string): boolean {
    while (element.parentNode && element.parentNode.nodeName.toLowerCase() != "body") {
        element = element.parentNode;
        if (element.className.toLowerCase().includes("canvas")) {
            return true;
        }
    }

    for (let i = 0; i < plugin.settings.excludedFilePaths.length; i++) {
        let path = plugin.settings.excludedFilePaths[i];
        if (path.isFile && fileName == path.path) {
            return false;
        } else if (!path.isFile) {
            let pathRegex = new RegExp(`\\b${path.path}/`);
            if (pathRegex.test(fileName)) return false;
        }
    }

    return true;
}  

// Convert "filename#heading" to "filename > heading" and "filename#^blockID" to "filename > ^blockID"
function translateLink(targetLink: string): string {
    function translateLinkImpl(targetLink: string, pattern: RegExp): string | undefined {
        let result = pattern.exec(targetLink);
        if (result)
            return (result[1] ? `${result[1]} > ` : "") + `${result[2]}`
    }

    let headingPattern = /(^.*)#([^\^].*)/;
    let blockPattern = /(^.*)#(\^[a-zA-Z0-9\-]+)/;
    let translatedAsHeading = translateLinkImpl(targetLink, headingPattern);
    let translatedAsBlock = translateLinkImpl(targetLink, blockPattern);
    return translatedAsHeading ?? translatedAsBlock ?? "";
}  
