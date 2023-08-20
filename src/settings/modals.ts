import { Setting, Modal, TextComponent, Notice, TFile, App } from "obsidian";
import { Template, FilePath } from "./settings"

interface MathLinksModalState {
    saved: boolean;
    error: string[];
}

export class AddTemplatesModal extends Modal implements MathLinksModalState {
    saved: boolean = false;
    error: string[] = ["MathLinks: Please enter a title", "MathLinks: Please enter a non-empty string to be replaced"];

    newTemplate: Template;
    templates: Template[] = [];

    constructor(app: App, templates: Template[]) {
        super(app);
        this.templates = templates;
        this.newTemplate = { title: "", replaced: "", replacement: "", globalMatch: true, sensitive: true, word: true };
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        loadTemplateSettings(contentEl, this.newTemplate, this);
        loadButtonsToClose(this, this.contentEl.createDiv(), "Add", "Cancel");
    }
}

export class EditTemplatesModal extends Modal implements MathLinksModalState {
    saved: boolean = false;
    error: string[] = ["", ""];

    templateTitle: string;
    templates: Template[];

    constructor(app: App, templateTitle: string, templates: Template[]) {
        super(app);
        this.templateTitle = templateTitle;
        this.templates = templates;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        this.templates.every((template) => {
            if (this.templateTitle != undefined && template.title == this.templateTitle) {
                loadTemplateSettings(contentEl, template, this);
                return false;
            }
            return true;
        });

        loadButtonsToClose(this, this.contentEl.createDiv(), "Save", "Cancel");
    }
}

export class AddExcludedModal extends Modal implements MathLinksModalState {
    saved: boolean = false;
    error: string[] = ["MathLinks: Please enter a valid file/path", ""];

    newExcludedFilePath: FilePath;

    excludedFilePaths: FilePath[];

    constructor(app: App, excludedFilePaths: FilePath[]) {
        super(app);
        this.excludedFilePaths = excludedFilePaths;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        let excludedFilePathText: TextComponent;
        new Setting(contentEl)
            .setName("File name/path of folder")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({ text: "Enter a file as" });
                    e.createEl("code", { text: "path/name.md" });
                    e.createSpan({ text: " and a folder as " });
                    e.createEl("code", { text: "path" });
                    e.createSpan({ text: "." });
                })
            )
            .addText((text) => {
                excludedFilePathText = text;
                let footerEl = this.contentEl.createDiv();
                loadButtonsToClose(this, footerEl, "Add", "Cancel");
                excludedFilePathText
                    .onChange((current) => {
                        let file = app.vault.getAbstractFileByPath(current);
                        if (file != null) {
                            this.newExcludedFilePath = {path: file.path, isFile: file instanceof TFile};
                            this.error[0] = "";
                        } else {
                            this.error[0] = "MathLinks: Please enter a valid file/path";
                        }

                        this.error[1] = "";
                        this.excludedFilePaths.every((filePath) => {
                            if (filePath.path == current) {
                                this.error[1] = "MathLinks: Duplicate file/path";
                                return false;
                            }
                            return true;
                        });

                        footerEl.empty();
                        loadButtonsToClose(this, footerEl, "Add", "Cancel");
                    });
            });
    }
}

export class ConfirmModal extends Modal implements MathLinksModalState {
    saved: boolean = false;
    error: string[] = [];

    areYouSure: string;
    proceed: string;
    noProceed: string;

    constructor(app: App, areYouSure: string, proceed: string, noProceed: string) {
        super(app);
        this.areYouSure = areYouSure;
        this.proceed = proceed;
        this.noProceed = noProceed;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl("h3", { text: this.areYouSure });
        loadButtonsToClose(this, this.contentEl.createDiv(), this.proceed, this.noProceed);
    }
}

function loadTemplateSettings<M extends Modal & MathLinksModalState>(contentEl: HTMLElement, template: Template, modal: M) {
    let titleText: TextComponent;
    new Setting(contentEl)
        .setName("Title")
        .setDesc("Name of the template.")
        .addText((text) => {
            titleText = text;
            titleText.setValue(template.title).onChange((current) => {
                modal.error[0] = "";
                if (modal instanceof AddTemplatesModal) {
                    modal.templates.every((t) => {
                        if (current != "" && current == t.title) {
                            modal.error[0] = "MathLinks: Duplicate title";
                            return false;
                        }
                        return true;
                    });
                }

                if (current == "") {
                    modal.error[0] = "MathLinks: Please enter a title";
                } else {
                    template.title = current;
                }
            });
        });

    let replacedText: TextComponent;
    new Setting(contentEl)
        .setName("Match for...")
        .setDesc("String to be matched and replaced. Do not include regex.")
        .addText((text) => {
            replacedText = text;
            replacedText.setValue(template.replaced).onChange((current) => {
                template.replaced = current;
                modal.error[1] = "";
                if (template.replaced == "") {
                    modal.error[1] = "MathLinks: Please enter a non-empty string to be replaced"
                }
            });
        });

    let replacementText: TextComponent;
    new Setting(contentEl)
        .setName("Replace with...")
        .setDesc("String to replace matches. Do not escape backslashes.")
        .addText((text) => {
            replacementText = text;
            replacementText.setValue(template.replacement).onChange((current) => {
                template.replacement = current;
            });
        });

    new Setting(contentEl)
        .setName("Global match")
        .setDesc("Match all instances (instead of just the first).")
        .addToggle((toggle) => {
            toggle.setValue(template.globalMatch).onChange((current) => (template.globalMatch = current));
        });

    new Setting(contentEl)
        .setName("Case sensitive")
        .setDesc("Matches will be case sensitive.")
        .addToggle((toggle) => {
            toggle.setValue(template.sensitive).onChange((current) => (template.sensitive = current));
        });

    new Setting(contentEl)
        .setName("Match whole words")
        .setDesc("Only match whole words.")
        .addToggle((toggle) => {
            toggle.setValue(template.word).onChange((current) => (template.word = current));
        });
}

function loadButtonsToClose<M extends Modal & MathLinksModalState>(modal: M, element: HTMLElement, trueToolTip: string, falseToolTip: string) {
    let footerButtons = new Setting(element);
    footerButtons.addButton((b) => {
        b.setTooltip(trueToolTip)
            .setIcon("checkmark")
            .onClick(async () => {
                let proceed = modal.error.every((error) => {
                    if (error != "") {
                        return false;
                    }
                    return true;
                })

                if (!proceed) {
                    modal.error.forEach((error) => {
                        if (error != "") {
                            new Notice(error);
                        }
                    })
                } else {
                    modal.saved = true;
                    modal.close();
                }
            });
    });
    footerButtons.addExtraButton((b) => {
        b.setTooltip(falseToolTip)
            .setIcon("cross")
            .onClick(async () => {
                modal.saved = false;
                modal.close();
            });
    });
}
