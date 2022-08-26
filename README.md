# :symbols: Obsidian MathLinks

An [Obsidian.md](https://obsidian.md) plugin to render [MathJax](https://www.mathjax.org/) in your links.

**Note**: As of `0.2.0`, this plugin will no longer edit the links themselves.

You can currently install it using [BRAT](https://github.com/TfTHacker/obsidian42-brat) or by copying `main.js` and `manifest.json` from [the latest release](https://github.com/zhaoshenzhai/obsidian-mathlinks/releases/tag/0.2.1) to a folder named `obsidian-mathlinks` in `.obsidian/plugins/`.

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
* **Title**: Name of the template to refer back to when editing/deleting a template.
* **Match for**: String to be matched and replaced. Do not include regex; they will be formatted internally.
* **Replace with**: String to replace matches. Do not escape backslashes; they will be formatted internally.
* **Global match**: Match all instances (instead of just the first). _Default: true_.
* **Case sensitive**: Matches will be cases sensitive. _Default: true_.
* **Match whole words**: Only match whole words. _Default: true_.

### Edit/delete a template
This adds a drop-down list containing the titles of all templates added, and two buttons:
* **Edit**: Opens the same modal as before with all the saved options.
* **Delete**: Opens a modal to confirm deletion.

### Add an excluded file
MathLinks will ignore those files. If `path` is entered, all files under `path` will be ignored.

### Remove from excluded file
Remove a file/path from the list of excluded files.

## :clipboard: Changelog
### 0.2.1
* Fixed duplicate title.
### 0.2.0
* No longer edit the links themselves. Instead, a markdown post-processor is registered which renders individual inline MathJax equations (like `$...$`) and patches them back together.
### 0.1.4
* Fixed duplicate templates and excluded files/paths.
### 0.1.3
* Fixed excluding files when updating backlinks.
### 0.1.2
* Use `this.app.vault.configDir` instead of `.obsidian`.
### 0.1.1
* Fixed reverting back to wikilinks when `Use [[Wikilinks]]` is disabled. Instead, revert back to its markdown link.
### 0.1.0
Initial release!
* Automatically creates a mathLink whenever a new link is created. This only happens if the file that is linked to has a mathLink, as indicated in its YAML as `mathLink: ...`.
* Automatically update links of the form `[...](fileName)` in all backlinks when `fileName.md` is updated. This only happens if `fileName.md` has a mathLink.
* Automatically revert links of the form `[...](fileName)` back to `[[fileName]]` in all backlinks when `mathLink: ...` is removed from the YAML in `fileName.md`.
* MathLink Templates, which automatically generate mathLinks by matching certain substrings of `fileName` to be replaced. Use `mathLink: auto` in `fileName.md` to use templates.
* Command to update all mathLinks.
* Exclude certain notes/paths; MathLinks will ignore them.
* Option to turn off `autoUpdate`.
