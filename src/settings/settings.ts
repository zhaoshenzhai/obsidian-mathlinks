import { TAbstractFile } from "obsidian";

export interface MathLinksSettings {
    templates: Template[];
    excludedPaths: string[];
    blockPrefix: string;
    enableFileNameBlockLinks: boolean;
    enableAPI: boolean;
}

export type Template = {
    title: string;
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
    enableAPI: true,
}
