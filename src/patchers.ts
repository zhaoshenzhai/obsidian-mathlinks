import { BlockSubpathResult, HeadingSubpathResult, SearchMatches, TFile, resolveSubpath } from 'obsidian';
import { around } from 'monkey-around';
import MathLinks from './main';
import { _getMathLink, getMathLink, setMathLink } from './links/helper';
import { EditorSuggest } from 'obsidian';

// https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/55
// Patch the core Outline view to render MathJax in it
export const patchOutline = (plugin: MathLinks): boolean => {
    const outlineView = plugin.app.workspace.getLeavesOfType('outline')[0]?.view;
    if (!outlineView) return false;

    plugin.register(
        around(outlineView.constructor.prototype, {
            getItemDom(old) {
                return function (arg) {
                    const ret = old.call(this, arg);
                    // Wait for the ret.innerEl (div.tree-item-inner) to be fully rendered 
                    // by the core Outline plugin
                    setTimeout(() => setMathLink(ret.heading.heading, ret.innerEl));
                    return ret;
                }
            },
        })
    )

    return true;
}


// https://github.com/RyotaUshio/obsidian-math-booster/issues/190
// Patch the built-in link autocompletion to render MathJax in it

interface LinkInfo {
    file: TFile;
    matches: SearchMatches | null;
    path: string;
    score: number;
    subpath?: string;
};

interface FileLinkInfo extends LinkInfo {
    type: "file";
}

interface HeadingLinkInfo extends LinkInfo {
    type: "heading";
    heading: string;
    level: number;
    subpath: string;
}

interface BlockLinkInfo extends LinkInfo {
    type: "block";
    idMatch: SearchMatches | null;
    subpath: string;
    node: any;
    display: string;
    content: string;
}

type BuiltInAutocompletion = EditorSuggest<FileLinkInfo | HeadingLinkInfo | BlockLinkInfo>;


export const patchLinkAutocompletion = (plugin: MathLinks): boolean => {
    const suggest = (plugin.app.workspace as any).editorSuggest.suggests[0] as BuiltInAutocompletion;
    if (!suggest) return false;

    plugin.register(
        around(suggest.constructor.prototype, {
            renderSuggestion(old) {
                return function (value: FileLinkInfo | HeadingLinkInfo | BlockLinkInfo, el: HTMLElement): void {
                    const sourceFile = (this as BuiltInAutocompletion).context?.file ?? null;
                    let subpathResult: HeadingSubpathResult | BlockSubpathResult | null = null;

                    if (value.type === "heading" || value.type === "block") {
                        const cache = plugin.app.metadataCache.getFileCache(value.file);
                        if (cache) {
                            subpathResult = resolveSubpath(cache, value.subpath);
                        }
                    }
                    const mathLink = _getMathLink(plugin, value.path, value.subpath ?? "", value.file, subpathResult, sourceFile);

                    old.call(this, value, el);

                    if (mathLink) {
                        const titleEl = el.querySelector<HTMLElement>('.suggestion-title');
                        if (titleEl) setMathLink(mathLink, titleEl);
                    }
                }
            },
        })
    )

    return true;
}
