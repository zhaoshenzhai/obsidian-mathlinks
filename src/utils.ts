import { TAbstractFile, TFolder } from "obsidian";
import MathLinks from "./main";

// Check if path is excluded
export function isExcluded(plugin: MathLinks, file: string | TAbstractFile): boolean {
    if (typeof file === "string") file = plugin.app.vault.getAbstractFileByPath(file);

    for (let i = 0; i < plugin.settings.excludedPaths.length; i++) {
        let excluded = plugin.app.vault.getAbstractFileByPath(plugin.settings.excludedPaths[i]);
        if (isEqualToOrChildOf(file, excluded)) return false;
    }

    return true;
}

// Convert "filename#heading" to "filename > heading" and "filename#^blockID" to "filename > ^blockID"
export function translateLink(targetLink: string): string {
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

// From https://github.com/RyotaUshio/obsidian-math-booster/blob/master/src/utils.ts
export function isEqualToOrChildOf(file1: TAbstractFile, file2: TAbstractFile): boolean {
    if (file1 == file2) return true;
    if (file2 instanceof TFolder && file2.isRoot()) return true;

    let ancestor = file1.parent;
    while (true) {
        if (ancestor == file2) return true;
        if (ancestor) {
            if (ancestor.isRoot()) return false;
            ancestor = ancestor.parent;
        }
    }
}
