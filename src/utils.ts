import { TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import MathLinks from "./main";

// Check if path is excluded
export function isExcluded(plugin: MathLinks, file: TAbstractFile): boolean {
    for (let i = 0; i < plugin.settings.excludedPaths.length; i++) {
        let excluded = plugin.app.vault.getAbstractFileByPath(plugin.settings.excludedPaths[i]);
        if (excluded && isEqualToOrChildOf(file, excluded)) return true;
    }
    return false;
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

export function isEqualToOrChildOf(file1: TAbstractFile, file2: TAbstractFile): boolean {
    if (file2 instanceof TFile) return file1.path === file2.path;
    if (file2 instanceof TFolder) {
        return file1.path.startsWith(file2.path + "/");
    }
    return false;
}
