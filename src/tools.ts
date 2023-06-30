import { TFile, renderMath, finishRenderMath } from 'obsidian';

export function getMathLink(plugin: MathLinks, file: TFile): string {
    if (!file)
        return undefined;

    let mathLink = plugin.app.metadataCache.getFileCache(file)?.frontmatter?.mathLink;

    if (mathLink === 'auto')
        mathLink = generateMathLinkFromAuto(plugin, plugin.settings, file);

    return mathLink;
}

export function replaceWithMathLink(element: HTMLElement, mathLink: string): HTMLElement {
    let splits: [string, boolean][] = [];

    let split = '';
    let isMath = false;
    for (let i = 0; i < mathLink.length; i++) {
        let character = mathLink[i];
        if (character === "$") {
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

export function isValid(plugin: MathLinks, settings: MathLinksSettings, element: HTMLElement, fileName: string): boolean {
    while(element.parentNode && element.parentNode.nodeName.toLowerCase() != 'body') {
        element = element.parentNode;
        if (element.className.toLowerCase().includes("canvas")) {
            console.log("canvas");
            return true;
        }
    }

    let file = plugin.app.vault.getAbstractFileByPath(fileName);
    if (!(file instanceof TFile)) {
        return false;
    }
    else if (isExcluded(file, settings.excludedFilePaths)) {
        return false;
    }

    return true;
}

function generateMathLinkFromAuto(plugin: MathLinks, settings: MathLinksSettings, file: Tfile): string {
    let templates = plugin.settings.templates;
    let mathLink = file.name.replace('\.md', '');
    for (let i = 0; i < templates.length; i++) {
        let replaced = new RegExp(templates[i].replaced);
        let replacement = templates[i].replacement;

        let flags = '';
        if (templates[i].globalMatch)
            flags += 'g';
        if (!templates[i].sensitive)
            flags += 'i';

        if (templates[i].word)
            replaced = RegExp(replaced.source.replace(/^/, '\\b').replace(/$/, '\\b'), flags);
        else
            replaced = RegExp(replaced.source, flags);

        mathLink = mathLink.replace(replaced, replacement);
    }

    return mathLink;
}

function isExcluded(file: TFile, excludedFilePaths: string[]): boolean {
    for (let i = 0; i < excludedFilePaths.length; i++) {
        let path = excludedFilePaths[i];
        if (path.isFile && file.path === path.path) {
            return true;
        } else if (!path.isFile) {
            let pathRegex = new RegExp(`\\b${path.path}/`);
            if (pathRegex.test(file.path))
                return true;
        }
    }
    return false;
}
