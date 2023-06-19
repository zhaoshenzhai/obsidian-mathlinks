# Obsidian MathLinks

An [Obsidian.md](https://obsidian.md) plugin to render and manage [MathJax](https://www.mathjax.org/) in your links.

Associate a `mathLink` to your note, containing arbitrary MathJax, and have it displayed in all links to the note.
* Works in both reading and live-preview modes, as well as canvases.
* Add custom [templates](https://github.com/zhaoshenzhai/obsidian-mathlinks/tree/master#templates) for `mathLinks`.
* Compatible with [Extended MathJax](https://github.com/xldenis/obsidian-latex) and [Dataview](https://github.com/blacksmithgu/obsidian-dataview).

![](https://raw.githubusercontent.com/zhaoshenzhai/obsidian-mathlinks/master/.github/sample.png)

## Description and Usage

As far as I know, the standard wiki-style links of the form `[[fileName]]` used in Obsidian does not support MathJax. Instead, one should use markdown-style links which are of the form `[displayedText](fileName.md)`; here, `displayedText` can contain MathJax. However, `displayedText` remains unchanged when link is updated, so, if one wishes to have links with math, one needs to update them manually. This can get out of hand really fast.

This plugin aims to solve this issue by assigning `fileName.md` a `mathLink`, i.e. some specified text to be displayed and rendered when a note links to `fileName.md`. It can be done by inserting `mathLink: yourMathLink` to the YAML frontmatter of `fileName.md` like so:

```
---
mathLink: yourMathLink
---

Content starts here.
```

That's it! All links of the form `[[fileName]]` or `[fileName](fileName.md)` will now be displayed as the rendered MathJax of `yourMathLink`. No changes are made to your notes, and updates to `yourMathLink` will be reflected once the note with the link is reopened.

### Templates
Oftentimes, the `mathLink` of `fileName.md` involves replacing some text with its math counterpart. For instance, all of `Invertible iff bijective.md`, `Linearly dependent iff exists span-redundant element.md`, and `LUB property iff GLB property.md` will have `mathLinks` of the form '... $\Leftrightarrow$ ...'.

Instead of setting them manually, simply use `mathLink: auto`. This will generate its `mathLink` via a template that replaces `iff` with $\Leftrightarrow$. A _template_ consists of a string to be matched (`iff`), its replacement $(\Leftrightarrow)$, and some options (global match, case sensitive, and match whole words). They are created and maintained in the MathLinks settings window.

## Settings
### Templates
Each template has the following options, which can be configured when the template is created/edited.
| Field | Description | Default |
| ----- | ----------- | ------- |
| Title | Name of the template to refer back to when editing/deleting a template. | _None_ |
| Match for | String to be matched and replaced. Do not include regex. | _None_ |
| Replace with | String to replace matches. Do not escape backslashes. | _None_ |
| Global match | Match all instances (instead of just the first). | `true` |
| Case sensitive | Matches will be case sensitive. | `true` |
| Match whole words | Only match whole words. | `true` |

### Excluded Files
MathLinks will ignore those files. If `path` is entered, all files under `path` will be ignored.
* Note that `path` must be relative to the vault directory.

## Changelog
### 0.2.x: _No longer edit the links themselves._
* 0.2.8: [#7](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/7): Render `mathLinks` in live-preview.
* 0.2.7: [#6](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/6): Render `mathLinks` in Canvas.
* 0.2.6: [#4](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/4), [#5](https://github.com/zhaoshenzhai/obsidian-mathlinks/pull/5): Added Dataview support.
* 0.2.5: [#3](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/3): Fixed decoding `UTf-8` characters in `fileName`.
* 0.2.4: [#2](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/2): Fixed not respecting custom link names.
* 0.2.3: [#1](https://github.com/zhaoshenzhai/obsidian-mathlinks/issues/1): Fixed only checking for files in `fileManager.getNewFileParent()`.
* 0.2.2: Simplified `getMathLink()`.
* 0.2.1: Fixed duplicate title.
* 0.2.0: No longer edit the links themselves. Instead, a markdown post-processor is registered which renders individual inline MathJax equations (like `$...$`) and patches them back together.
### 0.1.x: _Initial release._
* 0.1.4: Fixed duplicate templates and excluded files/paths.
* 0.1.3: Fixed excluding files when updating backlinks.
* 0.1.2: Use `this.app.vault.configDir` instead of `.obsidian`.
* 0.1.1: Fixed reverting back to Wikilinks when `Use [[Wikilinks]]` is disabled. Instead, revert back to its markdown link.
* 0.1.0: Initial release!
