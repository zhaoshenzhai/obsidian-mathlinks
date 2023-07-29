import { syntaxTree } from '@codemirror/language';
import { useDebugValue } from "react";
import { TFile, renderMath, finishRenderMath, Editor, Vault, parseLinktext, resolveSubpath, getLinkpath, EditorSuggestContext, MarkdownRenderer, Component } from "obsidian";

// Generate all mathLinks in element to be added in the MarkdownPostProcessor in reading view
export function generateMathLinks(plugin: MathLinks, element: HTMLElement, sourcePath: string): void {
    for (let targetEl of element.querySelectorAll(".internal-link")) {
        // if (targetEl.classList.contains("mathLink-internal-link")) {
        //     targetEl.remove();
        //     targetEl = element.querySelector(".original-internal-link");
        //     targetEl.classList.remove("original-internal-link");
        //     targetEl.style.display = "";
        // }

        let targetText = targetEl.textContent.trim();
        let targetHTML = targetEl.innerHTML;
        let targetFileName = decodeURI(targetEl.href.replace(/app\:\/\/obsidian\.md\//g, "")).replace(/\.md$/, "");
        let targetBaseName = targetFileName.replace(/^.*[\\\/]/, '');

        let linktext = targetEl.getAttribute("data-href");

        let mathLinkEl;
        if (targetText != targetFileName && targetText != targetBaseName && targetText != "" && targetHTML == targetText && !linktext.startsWith("#")) {
            addMathLink(targetEl, targetText, true);
        } else {
            let targetMathLink = getMathLink(plugin, linktext, sourcePath);
            if (targetMathLink) {
                let targetFile = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(linktext), sourcePath);
                if (targetEl.innerText == targetFileName || targetEl.innerText == targetFile.basename || targetEl.innerText == translateLink(linktext)) {
                    addMathLink(targetEl, targetMathLink, true);
                }
            }
        }
    }
}

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

    // let mathLinkEl = targetEl.cloneNode(newElement);
    // mathLinkEl.innerText = "";
    // for (let i = 0; i < splits.length; i++) {
    //     let word = splits[i][0];
    //     if (splits[i][1]) {
    //         let wordMath = renderMath(word, false);
    //         let mathEl = mathLinkEl.createSpan();
    //         mathEl.replaceWith(wordMath);
    //     } else {
    //         let wordEl = mathLinkEl.createSpan();
    //         wordEl.innerText += word;
    //     }
    // }

    // finishRenderMath();
    // if (newElement) {
    //      targetEl.parentNode.insertBefore(mathLinkEl, targetEl.nextSibling);
    //      mathLinkEl.classList.add("mathLink-internal-link");
    //      targetEl.classList.add("original-internal-link");
    //      targetEl.style.display = "none";
    // }

    targetEl.innerText = "";
    for (let i = 0; i < splits.length; i++) {
        let word = splits[i][0];
        if (splits[i][1]) {
            let wordMath = renderMath(word, false);
            let mathEl = targetEl.createSpan();
            mathEl.replaceWith(wordMath);
        } else {
            let wordEl = targetEl.createSpan();
            wordEl.innerText += word;
        }
    }

    finishRenderMath();

    return targetEl;
}

export function getMathLink(plugin: MathLinks, linktext: string, sourcePath: string): string {
    sourcePath = sourcePath ?? ""; // used to identity note title even when linktext has no linkpath (e.g. [[#heading]] or [[#^blockID]])
    let mathLink = "";
    let { path, subpath } = parseLinktext(linktext);
    let file = plugin.app.metadataCache.getFirstLinkpathDest(path, sourcePath);
    if (!file) return "";
    let cache = plugin.app.metadataCache.getFileCache(file);
    if (!cache) return "";

    let subpathResult = resolveSubpath(cache, subpath);
    if (cache.frontmatter) {
        if (subpathResult) {
            let subMathLink = '';
            if (subpathResult.type == 'heading') { 
                subMathLink = subpathResult.current.heading;
            } else if (subpathResult.type == 'block' && cache.frontmatter["mathLinks-block"]) {
                subMathLink = '^' + cache.frontmatter["mathLinks-block"][subpathResult.block.id];
            }
            if (path) { 
                // [[note title#heading]] -> "note title#heading"
                // [[note title#blockID]] -> "note title#^blockID"
                mathLink = (cache.frontmatter.mathLink ?? path) + '#' + subMathLink;
            } else { 
                // [[#heading]] -> "heading"
                // [[#^blockID]] -> "^blockID"
                mathLink = subMathLink;
            }            
        } else {
            mathLink = cache.frontmatter.mathLink;
        }
    }


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

function translateLinkImpl(linktext: string, pattern: RegExp): string | undefined {
    const result = pattern.exec(linktext);
    if (result) {
        return (result[1] ? `${result[1]} > ` : "") + `${result[2]}`
    }
}  

function translateLink(linktext: string): string {
    // convert "filename#heading" to "filename > heading" 
    // and "filename#^blockID" to "filename > ^blockID"
    const headingPattern = /(^.*)#([^\^].*)/;
    const blockPattern = /(^.*)#(\^[a-zA-Z0-9\-]+)/;    
    const translatedAsHeading = translateLinkImpl(linktext, headingPattern);
    const translatedAsBlock = translateLinkImpl(linktext, blockPattern);
    return translatedAsHeading ?? translatedAsBlock ?? '';
}  
