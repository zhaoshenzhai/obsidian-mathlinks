import { TFile, renderMath, finishRenderMath } from "obsidian";

export function generateMathLinks(plugin: MathLinks, element: HTMLElement): Promise<void> {
    for (let outLinkEl of element.querySelectorAll(".internal-link")) {
        let outLinkText = outLinkEl.textContent.trim();
        let outLinkHTML = outLinkEl.innerHTML;
        let outLinkFileName = decodeURI(outLinkEl.href.replace(/app\:\/\/obsidian\.md\//g, "")).replace(/\.md$/, "");

        if (outLinkText != outLinkFileName && outLinkText != "" && outLinkHTML == outLinkText) {
            outLinkEl = replaceWithMathLink(outLinkEl, outLinkText);
        } else {
            let outLinkFile = plugin.app.metadataCache.getFirstLinkpathDest(outLinkFileName, "");
            let outLinkMathLink = getMathLink(plugin, outLinkFile);
            if (outLinkMathLink) {
                if (outLinkEl.innerText == outLinkFileName || outLinkEl.innerText == outLinkFile.basename) {
                    outLinkEl = replaceWithMathLink(outLinkEl, outLinkMathLink);
                }
            }
        }
    }

    return new Promise ((resolve) => {resolve()});
}

export function isValid(plugin: MathLinks, element: HTMLElement, fileName: string): boolean {
    while(element.parentNode && element.parentNode.nodeName.toLowerCase() != "body") {
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

export function replaceWithMathLink(element: HTMLElement, mathLink: string): HTMLElement {
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

    element.innerText = "";
    for (let i = 0; i < splits.length; i++) {
        let word = splits[i][0];
        if (splits[i][1]) {
            let wordMath = renderMath(word, false);
            let mathEl = element.createSpan();
            mathEl.replaceWith(wordMath);
        } else {
            let wordEl = element.createSpan();
            wordEl.innerText += word;
        }
    }

    finishRenderMath();
    return element;
}

export function getMathLink(plugin: MathLinks, file: TFile): string {
    if (!file) return undefined;

    let mathLink = plugin.app.metadataCache.getFileCache(file)?.frontmatter?.mathLink;

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

    return mathLink;
}
