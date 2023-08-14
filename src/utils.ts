import MathLinks from "./main";

export function isValid(plugin: MathLinks, fileName: string): boolean {
    if (fileName.endsWith(".canvas")) return true;
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
