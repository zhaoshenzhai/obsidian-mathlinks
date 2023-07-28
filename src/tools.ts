import { syntaxTree } from '@codemirror/language';
import { TFile, renderMath, finishRenderMath, Editor, Vault, parseLinktext, resolveSubpath, getLinkpath, EditorSuggestContext, MarkdownRenderer, Component } from "obsidian";
import MathLinks from "./main";
import { useDebugValue } from "react";

export function generateMathLinks(plugin: MathLinks, element: HTMLElement, sourcePath: string): Promise<void> {
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

        let linktext = outLinkEl.getAttribute("data-href");

        console.log("-------------------------------------");
        console.log(`outLinkText = ${outLinkText}`);
        console.log(`outLinkHTML = ${outLinkHTML}`);
        console.log(`outLinkEl.href = ${outLinkEl.href}`);
        console.log(`outLinkFileName = ${outLinkFileName}`);
        console.log(`outLinkBaseName = ${outLinkBaseName}`);
        console.log(`linktext = ${linktext}`);
        console.log(`outLinkText != outLinkFileName = ${outLinkText != outLinkFileName}`);
        console.log(`outLinkText != outLinkBaseName = ${outLinkText != outLinkBaseName}`);
        console.log(`outLinkText != "" = ${outLinkText != ""}`);
        console.log(`outLinkHTML == outLinkText = ${outLinkHTML == outLinkText}`);    
        console.log(`!linktext.startsWith("#") = ${!linktext.startsWith("#")}`);    
        

        let mathLinkEl;
        if (outLinkText != outLinkFileName && outLinkText != outLinkBaseName && outLinkText != "" && outLinkHTML == outLinkText && !linktext.startsWith("#")) {
            addMathLink(outLinkEl, outLinkText, true);
        } else {
            let outLinkMathLink = getMathLink(plugin, linktext, sourcePath);
            if (outLinkMathLink) {
                let outLinkFile = plugin.app.metadataCache.getFirstLinkpathDest(getLinkpath(linktext), sourcePath);
                if (outLinkEl.innerText == outLinkFileName || outLinkEl.innerText == outLinkFile.basename || outLinkEl.innerText == translateLink(linktext)) {
                    addMathLink(outLinkEl, outLinkMathLink, true);
                }
                console.log(`outLinkMathLink = ${outLinkMathLink}`);
            }
        }
    }

    console.log("-------------------------------------");

    return new Promise((resolve) => { resolve() });
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
                subMathLink = cache.frontmatter["mathLinks-block"][subpathResult.block.id];
            }
            if (path) { // [[note title#heading]] -> "note title > heading"
                mathLink = (cache.frontmatter.mathLink ?? path) + ' > ' + subMathLink;
            } else { // [[#heading]] -> "heading"
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
