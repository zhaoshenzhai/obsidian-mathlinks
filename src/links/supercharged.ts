import { TFile } from "obsidian";
import MathLinks from "../main";

export function addSuperCharged(plugin: MathLinks, span: HTMLElement, outLinkFile: TFile): void {
    if (outLinkFile && plugin.app.plugins.enabledPlugins.has("supercharged-links-obsidian")) {
        let superCharged = getSuperCharged(plugin, outLinkFile);
        span.classList.add("data-link-icon");
        span.classList.add("data-link-icon-after");
        span.classList.add("data-link-text");
        span.setAttribute("data-link-path", outLinkFile.path);
        span.setAttribute("data-link-tags", superCharged[0]);
        for (let i = 0; i < superCharged[1].length; i++)
            span.setAttribute("data-link-" + superCharged[1][i][0], superCharged[1][i][1]);
    }
}

function getSuperCharged(plugin: MathLinks, file: TFile): [string, [string, string][]] {
    const data = plugin.app.plugins.plugins["supercharged-links-obsidian"]?.settings;

    let tagArr = plugin.app.metadataCache.getFileCache(file)?.tags;
    let tags: string = "";
    if (tagArr) {
        for (let i = 0; i < tagArr.length; i++)
            tags += tagArr[i].tag.replace(/#/, "") + " ";
        tags = tags.trimEnd();
    }

    let attributes: [string, string][] = [];
    let frontmatter = plugin.app.metadataCache.getFileCache(file)?.frontmatter;
    if (data) {
        for (let attr in frontmatter) {
            if (attr != "mathLink" && attr != "position") {
                let selectors = data.selectors;
                for (let i = 0; i < selectors.length; i++) {
                    if (selectors[i].name == attr && selectors[i].value == frontmatter[attr]) {
                        attributes.push([attr, frontmatter[attr]]);
                    } else if (selectors[i].type == "tag" && selectors[i].value == frontmatter[attr] && data.targetTags) {
                        attributes.push([attr, frontmatter[attr]]);
                    }
                }
            }
        }
    }

    return [tags, attributes];
}
