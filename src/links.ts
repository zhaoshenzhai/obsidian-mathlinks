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

        // 1. when user updates the YAML frontmatter
        this.plugin.registerEvent(this.plugin.app.metadataCache.on("changed", (changedFile) => {
            if (!this.targetFile || this.targetFile == changedFile) {
                this.update();
            }
        }));

        // 2. when an API user updates its metadata
        this.plugin.registerEvent(this.plugin.app.metadataCache.on("mathlinks:updated", (apiAccount, changedFilePath) => {
            console.log("observed event mathlinks:updated: ", changedFilePath);
            if (!this.targetFile || this.targetFile.path == changedFilePath) {
                console.log("update!");
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
            // [[note|display]] -> use display as mathLink
            mathLink = this.displayText;
        } else {
            const targetName = this.targetFile?.basename;
            const targetDisplay = this.containerEl.innerText;
            if (targetDisplay == targetName || targetDisplay == translateLink(this.targetLink)) {
                // [[note]], [[note#heading]] or [[note#^blockID]]
                mathLink = getMathLink(this.plugin, this.targetLink, this.sourcePath);
            }
        }

        if (mathLink) {
            console.log("new mathlink:", mathLink);
            addMathLink(mathLink, this.containerEl, true);
        } else {
            addMathLink(this.displayText, this.containerEl, true);
        }
    }
}

export function generateMathLinks(plugin: MathLinks, element: HTMLElement, context: MarkdownPostProcessorContext): void {
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

export function addMathLink(source: string, targetEl: HTMLElement, newElement: boolean): HTMLElement {
    let mathLinkEl = targetEl.cloneNode(newElement) as HTMLElement;
    mathLinkEl.innerText = "";

    let mathPattern = /\$(.*?[^\s])\$/g;
    let textFrom = 0, textTo = 0;
    let result;
    while ((result = mathPattern.exec(source)) !== null) {
        let match = result[0];
        let mathString = result[1];
        textTo = result.index;
        if (textTo > textFrom) mathLinkEl.createSpan().replaceWith(source.slice(textFrom, textTo));

        let mathEl = renderMath(mathString, false);
        mathLinkEl.createSpan({ cls: ["math", "math-inline", "is-loaded"] }).replaceWith(mathEl);
        finishRenderMath();

        textFrom = mathPattern.lastIndex;
    }

    if (textFrom < source.length) mathLinkEl.createSpan().replaceWith(source.slice(textFrom));

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
