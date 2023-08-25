import { TFile, getLinkpath, MarkdownRenderChild, MarkdownPostProcessorContext } from "obsidian";
import { setMathLink, getMathLink } from "./helper"
import { translateLink } from "../utils";
import MathLinks from "../main"

export class MathLinksRenderChild extends MarkdownRenderChild {
    readonly targetFile: TFile | null;
    readonly getMathLink: () => string;
    mathLinkEl: HTMLElement;

    constructor(containerEl: HTMLElement, public plugin: MathLinks, public sourcePath: string, public targetLink: string, public displayText: string) {
        super(containerEl);
        this.targetFile = this.plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(this.targetLink), this.sourcePath);
        this.mathLinkEl = this.containerEl.cloneNode(true) as HTMLElement;
        this.mathLinkEl.textContent = "";
        this.containerEl.parentNode?.insertBefore(this.mathLinkEl, this.containerEl.nextSibling);
        this.mathLinkEl.classList.add("mathLink-internal-link");
        this.containerEl.classList.add("original-internal-link");
        this.containerEl.style.display = "none";
        this.getMathLink = this.setMathLinkGetter();
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
            if (!this.targetFile || this.targetFile.path == changedFilePath) {
                this.update();
            }
        }));

        // 3. when an API account is deleted
        this.plugin.registerEvent(this.plugin.app.metadataCache.on("mathlinks:account-deleted", (apiAccount) => {
            this.update();
        }));
    }

    setMathLinkGetter(): () => string {
        let getter = () => "";
        const targetName = this.targetFile?.basename;
        console.log("--------------------------");
        console.log(`this.displayText = ${this.displayText}\nthis.targetLink = ${this.targetLink}\ntargetName = ${targetName}\ntranslateLink(this.targetLink) = ${translateLink(this.targetLink)}`);
        console.log(`A: this.displayText != this.targetLink && this.displayText != translateLink(this.targetLink) = ${this.displayText != this.targetLink} && ${this.displayText != translateLink(this.targetLink)} = ${this.displayText != this.targetLink && this.displayText != translateLink(this.targetLink)}`);
        console.log(`B: this.displayText == targetName || this.displayText == translateLink(this.targetLink) = ${this.displayText == targetName} || ${this.displayText == translateLink(this.targetLink)} = ${this.displayText == targetName || this.displayText == translateLink(this.targetLink)}`);
        if (this.displayText != this.targetLink && this.displayText != translateLink(this.targetLink)) {
            // [[note|display]] -> use display as mathLink
            getter = () => this.displayText;
        } else {
            if (this.displayText == targetName || this.displayText == translateLink(this.targetLink)) {
                // [[note]], [[note#heading]] or [[note#^blockID]]
                getter = () => getMathLink(this.plugin, this.targetLink, this.sourcePath);
            }
        }
        console.log("GETTER = ", getter);
        return getter;
    }

    async update(): Promise<void> {
        const mathLink = this.getMathLink();

        if (mathLink) {
            setMathLink(mathLink, this.mathLinkEl);
        } else {
            setMathLink(this.displayText, this.mathLinkEl);
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
            const targetLink = targetEl.getAttribute("data-href");
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
