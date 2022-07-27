# :symbols: Obsidian MathLinks

An [Obsidian.md](https://obsidian.md) plugin to manage and display [MathJax](https://www.mathjax.org/) in your links. Work in progress!

**Note**: This plugin **will** modify the contents of your links. **_Proceed at your own risk_** and **_please make backups_** when trying it out. For more information, see [how it works](https://github.com/zhaoshenzhai/obsidian-mathlinks#grey_question-how-it-works).

Currently, you can install it by copying `main.js` and `manifest.json` from [the lastest release](https://github.com/zhaoshenzhai/obsidian-mathlinks/releases/tag/0.0.1) to a folder named `obsidian-mathlinks` in `.obsidian/plugins/`.

## :bookmark_tabs: Contents
* [Basic Usage](https://github.com/zhaoshenzhai/obsidian-mathlinks#pencil2-basic-usage); get started with creating mathLinks and templates.
* [Settings](https://github.com/zhaoshenzhai/obsidian-mathlinks#gear-settings); configure MathLinks: add/edit/delete templates, change update criteria, etc.
* [How it works](https://github.com/zhaoshenzhai/obsidian-mathlinks#grey_question-how-it-works); detailed description on how it works and what it modifies.
* [Changelog](https://github.com/zhaoshenzhai/obsidian-mathlinks#clipboard-changelog); see whats new!

## :pencil2: Basic Usage

A mathLink for `note.md` can be inserted by adding `mathLink: yourMathLink` to its yaml frontmatter. By default, this will update all links of the form `[[note]]` to `[yourMathLink](note.md)`, even if you create new ones. The rendered MathJax of `yourMathLink` will be displayed in preview mode.
* Changing `yourMathLink` in `note.md` will update all links of the form `[...](note.md)` accordingly.
* Deleting `mathLink: yourMathLink` will revert all such links back to `[[note]]`.

### Templates
Links where a mathLink makes sense are often repeated throughout.
* For instance, all of `Invertible iff bijective`, `Linearly dependent iff exists span-redundant element`, and `LUB property iff GLB property` will have mathLinks of the form '...$\Leftrightarrow$...'.

Instead of setting them manually, simply set `mathLink: auto` which will generate a mathLink via a template that replaces `iff` with $\Leftrightarrow$ in the file name. A _template_ consists of a string to be matched and replaced (`iff`), its replacement ($\Leftrightarrow$), and some options (global match, case sensitive, and match whole words). They are created and maintained in the MathLinks settings window.

## :gear: Settings

### Add a template
This opens a modal which prompts for:
* _Title_: Name of the template to refer back to when editing/deleting a template.
* _Match for_: String to be matched and replaced. Do not include regex; they will be formatted internally.
* _Replace with_: String to replace matches. Do not escape backslashes; they will be formatted internally.
* _Global match_: Match all instances (instead of just the first). _Default: true_.
* _Case sensitive_: Matches will be cases sensitive. _Default: true_.
* _Match whole words_: Only match whole words. _Default: true_.

### Edit/delete a template
This adds a dropdown list containing the titles of all templates added, and two buttons:
* _Edit_: Opens the same modal as before with all the saved options.
* _Delete_: Opens a modal to confirm deletion.

## :grey_question: How it works



## :clipboard: Changelog


