import { TFile, renderMath, finishRenderMath, parseLinktext, resolveSubpath, getLinkpath, BlockSubpathResult, HeadingSubpathResult, MarkdownRenderChild, MarkdownPostProcessorContext } from "obsidian";
import { translateLink } from "./utils";
import { MathLinksMetadata } from "./api";
import MathLinks from "./main";

export class MathLinksRenderChild extends MarkdownRenderChild {
    plugin: MathLinks;
    sourcePath: string;
    targetLink: string;
    displayText: string;
    targetFile: TFile | null;

    constructor(containerEl: HTMLElement, plugin: MathLinks, sourcePath: string, targetLink: string, displayText: string) {
        super(containerEl);
        this.plugin = plugin;
        this.sourcePath = sourcePath;
        this.targetLink = targetLink;
        this.displayText = displayText;
        this.targetFile = this.plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(this.targetLink), this.sourcePath);
    }

    onload(): void {
        this.update();

        // dynamically update the displayed text
        // 1. when user updates the YAML frontmatter
        this.plugin.registerEvent(this.plugin.app.metadataCache.on("changed", (changedFile) => {
            if (!this.targetFile || this.targetFile == changedFile) {
                this.update();
            }
        }));

        // 2. when an API user updates its metadata
        this.plugin.registerEvent(this.plugin.app.metadataCache.on("mathlinks:updated", (apiAccount, changedFilePath) => {
            if (!this.targetFile || this.targetFile.path == changedFilePath) {
                this.update();
            }
        }));

        // 3. when an API account is deleted
        this.plugin.registerEvent(this.plugin.app.metadataCache.on("mathlinks:account-deleted", (apiAccount) => {
            this.update();
        }));
    }

    async update(): Promise<void> {
        let mathLink = "";
        if (this.displayText != this.targetLink && this.displayText != translateLink(this.targetLink)) {
            // [[note name|display name]] -> use display name as mathLink
            mathLink = this.displayText;
        } else {
            const targetName = this.targetFile?.basename;
            const targetDisplay = this.containerEl.innerText;
            if (targetDisplay == targetName || targetDisplay == translateLink(this.targetLink)) {
                // [[note name]], [[note name#heading]] or [[note name#^blockID]]
                mathLink = getMathLink(this.plugin, this.targetLink, this.sourcePath);
            }
        }

        if (mathLink) {
            const children = await renderTextWithMath(mathLink);
            this.containerEl.replaceChildren(...children);    
        } else {
            this.containerEl.replaceChildren(this.displayText);
        }
    }
}

export function generateMathLinks(plugin: MathLinks, element: HTMLElement, context: MarkdownPostProcessorContext): void {
    for (let targetEl of element.querySelectorAll<HTMLElement>(".internal-link")) {
        const targetDisplay = targetEl.textContent?.trim();
        if (targetDisplay != "" && !/math-inline is-loaded/.test(targetEl.innerHTML)) {
            const targetLink = targetEl.getAttribute("data-href")?.replace(/\.md/, "");
            if (targetLink) {
                const targetFile = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(targetLink), context.sourcePath);
                if (targetDisplay && targetFile) {
                    const child = new MathLinksRenderChild(targetEl, plugin, context.sourcePath, targetLink, targetDisplay);
                    context.addChild(child);
                }
            }
        }
    }
}

export async function renderTextWithMath(source: string): Promise<(HTMLElement | string)[]> {
    let elements: (HTMLElement | string)[] = [];
    let mathPattern = /\$(.*?[^\s])\$/g;
    let textFrom = 0, textTo = 0;

    let result;
    while ((result = mathPattern.exec(source)) !== null) {
        let match = result[0];
        let mathString = result[1];
        textTo = result.index;
        if (textTo > textFrom) {
            elements.push(source.slice(textFrom, textTo));
        }
        textFrom = mathPattern.lastIndex;

        let mathJaxEl = renderMath(mathString, false);
        await finishRenderMath();

        let mathSpan = createSpan({ cls: ["math", "math-inline", "is-loaded"] });
        mathSpan.replaceChildren(mathJaxEl);
        elements.push(mathSpan);
    }

    if (textFrom < source.length) elements.push(source.slice(textFrom));

    return elements;
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
    // if (newElement) {
    //     targetEl.parentNode?.insertBefore(mathLinkEl, targetEl.nextSibling);
    //     mathLinkEl.classList.add("mathLink-internal-link");
    //     targetEl.classList.add("original-internal-link");
    //     targetEl.style.display = "none";
    // }

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

function getMathLinkFromSubpath(plugin: MathLinks, linkpath: string, subpathResult: HeadingSubpathResult | BlockSubpathResult, metadata: MathLinksMetadata, blockPrefix: string, enableFileNameBlockLinks: boolean): string {
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
