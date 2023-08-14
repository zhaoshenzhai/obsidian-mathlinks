# Obsidian MathLinks

An [Obsidian.md](https://obsidian.md) plugin to render and manage [MathJax](https://www.mathjax.org/) in your links.

Associate a `mathLink` to your note, containing arbitrary MathJax, and have it displayed in all links to the note.
* Works in both reading and live-preview modes, as well as canvases.
* Add custom [templates](https://github.com/zhaoshenzhai/obsidian-mathlinks/tree/master#templates) for `mathLinks`.
* Render MathJax in aliases for both Wikilinks and Markdown Links.
* Compatible with [Extended MathJax](https://github.com/xldenis/obsidian-latex) and [Dataview](https://github.com/blacksmithgu/obsidian-dataview).

![](https://raw.githubusercontent.com/zhaoshenzhai/obsidian-mathlinks/master/.github/sample.png)

## Description and Usage

Assigning a `mathLink` in the YAML frontmatter of `note.md` as shown below will make all links of them form `[[note]]` and `[note](note.md)` display as the rendered MathJax of `yourMathLink`. No changes are made to your notes, and updates to `yourMathLink` will be reflected (almost) instantaneously.

```
---
mathLink: yourMathLink
---

Content starts here.
```

This plugin also makes Wikilinks and Markdown Links compatible with MathJax, so links like `[[note|yourAlias]]` and `[yourAlias](note.md)` will be displayed as the rendered MathJax of `yourAlias`. A `mathLink` in `note`, if present, will be overridden by `yourAlias`.

### Links to Blocks/Headings
Additionally, Obsidian also supports links to blocks `[[note#^block-id]]` and headings like `[[note#section]]`. Any `MathJax` in `#section` will be rendered, and you can associate a `mathLink` to `^block-id` as well by adding a YAML frontmatter like so:

```
---
mathLink-blocks:
    block-id: yourMathLink
---
```

### Templates
Oftentimes, `mathLinks` of notes involve replacing some text with its math counterpart. For instance, you might have many notes whose title is of the form `... iff ...`.

Instead of setting the `mathLinks` of each note manually as `... $\Leftrightarrow$ ...`, simply use `mathLink: auto`. This will generate its `mathLink` via a template that replaces `iff` with `$\Leftrightarrow$`. A _template_ consists of a string to be matched (`iff`), its replacement (`$\Leftrightarrow$`), and some options (global match, case sensitive, and match whole words). They are created and maintained in the MathLinks settings window.

## Settings
### Templates
Each template has the following options, which can be configured when the template is created/edited.

| Field | Description | Default |
| ----- | ----------- | ------- |
| Title | Name of the template to refer back to when editing/deleting a template. |  |
| Match for | String to be matched and replaced. Do not include regex. |  |
| Replace with | String to replace matches. Do not escape backslashes. |  |
| Global match | Match all instances (instead of just the first). | `true` |
| Case sensitive | Matches will be case sensitive. | `true` |
| Match whole words | Only match whole words. | `true` |

### Excluded Files
MathLinks will ignore those files. If `path` is entered, all files under `path` will be ignored.
> **Note**:
> `path` must be relative to the vault directory.

### Links to Blocks/Headings
MathLinks supports links to blocks and headings like `[[note#^block-id]]` and `[[note#section]]`. You can modify how they are rendered by:
* Editing the prefix for block links: By default, block links are prefixed by `^`. This can be changed (or removed).
* Toggling whether to render `note`: If disabled, the links will be rendered as `[[^block-id]]` and `[[section]]`.

### Enable API
Expose some of `MathLinks`' features to other community plugins. Enabled by default.

## Contributing
If you would like to point out a bug, add support, or have a feature request, don't hesitate to open an issue/pull request! Thank you to all who have contributed.

## Changelog
### 0.4.x: _Heading/Block Links and API Integration._
* 0.4.1: Dynamic updating and published API as an `npm` package ([#33](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/33), [#34](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/34)).
* 0.4.0: Enable `mathLinks` in heading/block links with `mathLink-blocks` and API integration with other plugins, with credits to [RyotaUshio](https://github.com/RyotaUshio); fixed Supercharged links in live-preview ([#23](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/23), [#26](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/26), [#27](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/27), [#28](https://github.com/zhaoshenzhai/obsidian-mathlinks/discussions/28), [#30](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/30), [#31](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/31), [#32](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/32)).
### 0.3.x: _Merged with [obsidian-mathjax-wikilinks](https://github.com/aaron-jack-manning/obsidian-mathjax-wikilinks)._
* 0.3.5: Fixed creating new notes when anchor links are pressed ([#24](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/24)).
* 0.3.4: Fixed opening notes in new tab (`cmd` key and mouse); proper Dataview rendering in callouts ([#17](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/17), [#18](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/18), [#19](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/19), [#20](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/20)).
* 0.3.3: Open links in new tab when `ctrl` is held ([#16](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/16)).
* 0.3.2: Fixed `mathLinks` in live-preview, which should now render in most markdown elements. Made the `ViewPlugin` operate independently from each leaf, which now allows for multiple instances of the same file to be opened and rendered differently in live-preview and source ([#12](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/12), [#15](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/15)).
* 0.3.1: Render `mathLinks` in Dataview inline fields ([#13](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/13), [#14](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/14)).
* 0.3.0: Merged with [obsidian-mathjax-wikilinks](https://github.com/aaron-jack-manning/obsidian-mathjax-wikilinks), with credits to [aaron-jack-manning](https://github.com/aaron-jack-manning). Extended its functionality to include live-preview for both Wikilinks and Markdown Links ([#9](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/9)).
### 0.2.x: _No longer edit the links themselves._
* 0.2.9: Fixed hanging and 'creating new notes' on `layout-changed` for pinned notes ([#10](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/10), [#11](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/11)).
* 0.2.8: Render `mathLinks` in live-preview ([#7](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/7)).
* 0.2.7: Render `mathLinks` in canvas ([#6](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/6)).
* 0.2.6: Added Dataview support ([#4](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/4), [#5](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/5)).
* 0.2.5: Fixed decoding `UTf-8` characters in `fileName` ([#3](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/3)).
* 0.2.4: Fixed not respecting custom link names ([#2](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/2)).
* 0.2.3: Fixed only checking for files in `fileManager.getNewFileParent()` ([#1](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/1)).
* 0.2.2: Simplified `getMathLink()`.
* 0.2.1: Fixed duplicate title.
* 0.2.0: No longer edit the links themselves. Instead, a markdown post-processor is registered which renders individual inline MathJax equations (like `$...$`) and patches them back together.
### 0.1.x: _Initial release._
* 0.1.4: Fixed duplicate templates and excluded files/paths.
* 0.1.3: Fixed excluding files when updating backlinks.
* 0.1.2: Use `this.app.vault.configDir` instead of `.obsidian`.
* 0.1.1: Fixed reverting back to Wikilinks when `Use [[Wikilinks]]` is disabled. Instead, revert back to its Markdown Link.
* 0.1.0: Initial release!
