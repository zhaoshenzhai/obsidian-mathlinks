# :symbols: Obsidian MathLinks

An [Obsidian.md](https://obsidian.md) plugin to manage and display [MathJax](https://www.mathjax.org/) in your links. Work in progress!

**Note**: This plugin **will** modify the contents of your links. **_Proceed at your own risk_** and **_please make backups_** before trying it out.

Currently, you can install it by copying `main.js` and `manifest.json` from [the lastest release](https://github.com/zhaoshenzhai/obsidian-mathlinks/releases/tag/0.0.2) to a folder named `obsidian-mathlinks` in `.obsidian/plugins/`.

## :bookmark_tabs: Contents
* [Basic Usage](https://github.com/zhaoshenzhai/obsidian-mathlinks#pencil2-basic-usage)
* [Settings](https://github.com/zhaoshenzhai/obsidian-mathlinks#gear-settings)
* [Changelog](https://github.com/zhaoshenzhai/obsidian-mathlinks#clipboard-changelog)

## :pencil2: Basic Usage

A mathLink for `note.md` can be inserted by adding `mathLink: yourMathLink` to its yaml frontmatter. By default, this will update all links of the form `[[note]]` to `[yourMathLink](note.md)`, even if you create new ones. The rendered MathJax of `yourMathLink` will be displayed in preview mode.
* Changing `yourMathLink` in `note.md` will update all links of the form `[...](note.md)` accordingly.
* Deleting `mathLink: yourMathLink` will revert all such links back to `[[note]]`.

A command is available in the Command Palette which updates _all_ mathLinks in your vault. This should not normally be used unless `autoUpdate` is disabled.

### Templates
Links where a mathLink makes sense are often repeated throughout.
* For instance, all of `Invertible iff bijective`, `Linearly dependent iff exists span-redundant element`, and `LUB property iff GLB property` will have mathLinks of the form '...$\Leftrightarrow$...'.

Instead of setting them manually, simply set `mathLink: auto` which will generate a mathLink via a template that replaces `iff` with $\Leftrightarrow$ in the file name. A _template_ consists of a string to be matched (`iff`), its replacement ($\Leftrightarrow$), and some options (global match, case sensitive, and match whole words). They are created and maintained in the MathLinks settings window.

## :gear: Settings
### Update when modified
Automatically update links in the current file when modified. _Default: true_.

### Add a new template
This opens a modal which prompts for:
* **Title**: Name of the template to refer back to when editing/deleting a template.
* **Match for**: String to be matched and replaced. Do not include regex; they will be formatted internally.
* **Replace with**: String to replace matches. Do not escape backslashes; they will be formatted internally.
* **Global match**: Match all instances (instead of just the first). _Default: true_.
* **Case sensitive**: Matches will be cases sensitive. _Default: true_.
* **Match whole words**: Only match whole words. _Default: true_.

### Edit/delete a template
This adds a dropdown list containing the titles of all templates added, and two buttons:
* **Edit**: Opens the same modal as before with all the saved options.
* **Delete**: Opens a modal to confirm deletion.

### Add an excluded file
MathLinks will ignore those files. If `path` is entered, all files under `path` will be ignored.

### Remove from excluded file
Remove a file/path from the list of excluded files.

## :clipboard: Changelog
### 0.0.2
* New features:
    * Added option to exclude notes/paths. MathLinks will ignore them.
    * Added option to turn off `autoUpdate`.
* Bug fixes:
    * Show progress when updating all mathLinks.
    * `getMathLink()` returns whether it is generated from a template.
    * Automatically update mathLinks that link to `mathLink: auto` when templates are changed; reverts them when deleted.

### 0.0.1
* New features:
    * Automatically creates a mathLink whenever a new link is created. This only happens if the file that is linked to has a mathLink, as indicated in its yaml as `mathLink: ...`.
    * Automatically update links of the form `[...](fileName)` in all backlinks when `fileName.md` is updated. This only happens if `fileName.md` has a mathLink.
    * Automatically revert links of the form `[...](fileName)` back to `[[fileName]]` in all backlinks when `mathLink: ...` is removed from the yaml in `fileName.md`.
    * MathLink Templates, which automatically generate mathLinks by matching certain substrings of `fileName` to be replaced. Use `mathLink: auto` in `fileName.md` to use templates.
    * Command to update all mathLinks.
