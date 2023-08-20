export type Template = {
    title: string;
    replaced: string;
    replacement: string;
    globalMatch: boolean;
    sensitive: boolean;
    word: boolean;
}

export type FilePath = {
    path: string;
    isFile: boolean;
}

export interface MathLinksSettings {
    templates: Template[];
    excludedFilePaths: FilePath[];
    blockPrefix: string;
    enableFileNameBlockLinks: boolean;
    enableAPI: boolean;
}

export const DEFAULT_SETTINGS: MathLinksSettings = {
    templates: [],
    excludedFilePaths: [],
    blockPrefix: "^",
    enableFileNameBlockLinks: true,
    enableAPI: true,
}
