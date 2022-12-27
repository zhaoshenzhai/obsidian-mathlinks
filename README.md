# :symbols: Obsidian MathLinks

An [Obsidian.md](https://obsidian.md) plugin to render and manage [MathJax](https://www.mathjax.org/) in your links.

**No changes are made to your notes!** Simply associate a `mathLink` to your note, containing arbitrary MathJax, and have it displayed in all links to the note.

![](https://raw.githubusercontent.com/zhaoshenzhai/obsidian-mathlinks/master/.github/sample.png)

## :bookmark_tabs: Contents
* [Description and Usage](https://github.com/zhaoshenzhai/obsidian-mathlinks#pencil2-description-and-usage)
* [Settings](https://github.com/zhaoshenzhai/obsidian-mathlinks#gear-settings)
* [Changelog](https://github.com/zhaoshenzhai/obsidian-mathlinks#clipboard-changelog)

## :pencil2: Description and Usage

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
Oftentimes, the `mathLink` of `fileName.md` involves replacing some text with its math counterpart. For instance, all of `Invertible iff bijective.md`, `Linearly dependent iff exists span-redundant element.md`, and `LUB property iff GLB property.md` will have mathLinks of the form '... $\Leftrightarrow$ ...'.

Instead of setting them manually, simply use `mathLink: auto`. This will generate its `mathLink` via a template that replaces `iff` with $\Leftrightarrow$. A _template_ consists of a string to be matched (`iff`), its replacement $(\Leftrightarrow)$, and some options (global match, case sensitive, and match whole words). They are created and maintained in the MathLinks settings window.

## :gear: Settings
### Add a new template
This opens a modal which prompts for:
| Field             | Description                                                             | Default |
| -----             | ----------------------------------------------------------------------- | ------- |
| Title             | Name of the template to refer back to when editing/deleting a template. |         | 
| Match for         | String to be matched and replaced. Do not include regex.                |         |
| Replace with      | String to replace matches. Do not escape backslashes.                   |         |
| Global match      | Match all instances (instead of just the first).                        | `true`  |
| Case sensitive    | Matches will be case sensitive.                                         | `true`  |
| Match whole words | Only match whole workds.                                                | `true`  |

### Edit/delete a template
This adds a drop-down list containing the titles of all templates added, and two buttons:
* **Edit**: Opens the same modal as before with all the saved options.
* **Delete**: Opens a modal to confirm deletion.

### Add an excluded file
MathLinks will ignore those files. If `path` is entered, all files under `path` will be ignored.

### Remove from excluded file
Remove a file/path from the list of excluded files.

## :clipboard: Changelog
### 0.2.x: _No longer edit the links themselves._
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
* 0.1.1: Fixed reverting back to wikilinks when `Use [[Wikilinks]]` is disabled. Instead, revert back to its markdown link.
* 0.1.0: Initial release!
