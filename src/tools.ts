import { TFile, renderMath, finishRenderMath } from "obsidian";

export function generateMathLinks(plugin: MathLinks, element: HTMLElement): Promise<void> {
    for (let outLinkEl of element.querySelectorAll(".internal-link")) {
        if (outLinkEl.classList.contains("mathLink-internal-link")) {
            outLinkEl.remove();
            outLinkEl = element.querySelector(".original-internal-link");
            outLinkEl.classList.remove("original-internal-link");
            outLinkEl.style.display = "";
        }

        let outLinkText = outLinkEl.textContent.trim();
        let outLinkHTML = outLinkEl.innerHTML;
        let outLinkFileName = decodeURI(outLinkEl.href.replace(/app\:\/\/obsidian\.md\//g, "")).replace(/\.md$/, "");
        let outLinkBaseName = outLinkFileName.replace(/^.*[\\\/]/, '');

        let mathLinkEl;
        if (outLinkText != outLinkFileName && outLinkText != outLinkBaseName && outLinkText != "" && outLinkHTML == outLinkText) {
            addMathLink(outLinkEl, outLinkText, true);
        } else {
            let outLinkFile = plugin.app.metadataCache.getFirstLinkpathDest(outLinkFileName, "");
            let outLinkMathLink = getMathLink(plugin, outLinkFile);
            if (outLinkMathLink) {
                if (outLinkEl.innerText == outLinkFileName || outLinkEl.innerText == outLinkFile.basename) {
                    addMathLink(outLinkEl, outLinkMathLink, true);
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

export function addMathLink(outLinkEl: HTMLElement, mathLink: string, newElement: boolean): HTMLElement {
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

    let mathLinkEl = outLinkEl.cloneNode(newElement);
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
        outLinkEl.parentNode.insertBefore(mathLinkEl, outLinkEl.nextSibling);
        mathLinkEl.classList.add("mathLink-internal-link");
        outLinkEl.classList.add("original-internal-link");
        outLinkEl.style.display = "none";
    }

    return mathLinkEl;
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

export function getSuperCharged(plugin: MathLinks, file: TFile): [string, [string, string][]] {
    const data = app.plugins.getPlugin("supercharged-links-obsidian").settings;

    let tagArr = plugin.app.metadataCache.getFileCache(file).tags;
    let tags: string = "";
    for (let i = 0; i < tagArr.length; i++)
        tags += tagArr[i].tag.replace(/#/, "") + " ";
    tags = tags.trimEnd();

    let frontmatter = plugin.app.metadataCache.getFileCache(file).frontmatter;
    let attributes: [string, string][] = [];
    for (let attr in frontmatter) {
        if (attr != "mathLink" && attr != "position") {
            for (let i = 0; i < data.selectors.length; i++) {
                if (data.selectors[i].name == attr && data.selectors[i].value == frontmatter[attr]) {
                    attributes.push([attr, frontmatter[attr]]);
                }
            }
        }
    }

    return [tags, attributes];
}
