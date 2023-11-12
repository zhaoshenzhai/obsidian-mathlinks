export interface MathLinksSettings {
    templates: Template[];
    excludedPaths: string[];
    blockPrefix: string;
    enableFileNameBlockLinks: boolean;
    enableInSourceMode: boolean;
    renderOutline: boolean;
}

export type Template = {
    replaced: string;
    replacement: string;
    globalMatch: boolean;
    sensitive: boolean;
    word: boolean;
}

export const DEFAULT_SETTINGS: MathLinksSettings = {
    templates: [],
    excludedPaths: [],
    blockPrefix: "^",
    enableFileNameBlockLinks: true,
    enableInSourceMode: false,
    renderOutline: true,
}
