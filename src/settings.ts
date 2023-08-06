import { Setting, PluginSettingTab, Modal, TextComponent, DropdownComponent, Notice, TFile, ToggleComponent, ButtonComponent, ExtraButtonComponent, App } from "obsidian";
import MathLinks from "./main";

export interface MathLinksSettings {
    templates: string[];
    excludedFilePaths: string[];
    enableAPI: boolean;
}

export const DEFAULT_SETTINGS: MathLinksSettings = {
    templates: [],
    excludedFilePaths: [],
    enableAPI: true,
}

export class MathLinksSettingTab extends PluginSettingTab {
    plugin: MathLinks;

    constructor(app: App, plugin: MathLinks) {
        super(app, plugin);
        this.plugin = plugin;
    }

    async display(): Promise<void> {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl("h2", { text: "MathLinks Settings" });

        // Add a new template
        new Setting(containerEl)
            .setName("Add a new template")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({ text: "Generate mathLinks with a new template. Use " });
                    e.createEl("code", { text: "mathLink: auto" });
                    e.createSpan({ text: " to use templates in a file." });
                })
            )
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Add")
                    .setIcon("plus")
                    .onClick(async () => {
                        let modal = new AddTemplatesModal(this.app, this.plugin.settings.templates);

                        modal.onClose = async () => {
                            if (modal.saved) {
                                const template = {
                                    title: modal.title,
                                    replaced: modal.replaced,
                                    replacement: modal.replacement,
                                    globalMatch: modal.globalMatch,
                                    sensitive: modal.sensitive,
                                    word: modal.word
                                };

                                this.plugin.settings.templates.push(template);
                                await this.plugin.saveSettings();

                                new Notice("MathLinks: Template added");
                            }
                        };

                        modal.open();
                        this.display();
                    });
                return b;
            });

        // Edit/delete template
        let templateTitle: string | null;
        new Setting(containerEl)
            .setName("Edit/delete template")
            .setDesc("Select a template to edit/delete it.")
            .addDropdown((dropdown: DropdownComponent) => {
                dropdown.addOption("__select", "Select");
                this.plugin.settings.templates.forEach((template) => {
                    dropdown.addOption(template.title, template.title);
                })
                dropdown.onChange(async (current) => {
                    if (current != "__select")
                        templateTitle = current;
                    else
                        templateTitle = null;
                });
            })
            .addExtraButton((button: ExtraButtonComponent): ExtraButtonComponent => {
                let b = button
                    .setTooltip("Edit")
                    .setIcon("edit")
                    .onClick(async () => {
                        if (templateTitle) {
                            let originalTemplates = JSON.parse(JSON.stringify(this.plugin.settings.templates));
                            let modal = new EditTemplatesModal(this.app, templateTitle, this.plugin.settings.templates);

                            modal.onClose = async () => {
                                if (modal.saved) {
                                    await this.plugin.saveSettings();

                                    new Notice("MathLinks: Template saved");
                                } else {
                                    this.plugin.settings.templates = originalTemplates;
                                }
                            };

                            modal.open();
                            this.display();
                        } else {
                            new Notice("MathLinks: Please select a template");
                        }
                    });
                return b;
            })
            .addExtraButton((button: ExtraButtonComponent): ExtraButtonComponent => {
                let b = button
                    .setTooltip("Delete")
                    .setIcon("trash")
                    .onClick(async () => {
                        if (templateTitle) {
                            let modal = new ConfirmModal(this.app, `Are you sure you want to delete "${templateTitle}"?`, "Yes", "No");

                            modal.onClose = async () => {
                                if (modal.saved) {
                                    for (let i = 0; i < this.plugin.settings.templates.length; i++) {
                                        if (this.plugin.settings.templates[i].title == templateTitle) {
                                            this.plugin.settings.templates.splice(i, 1);
                                            await this.plugin.saveSettings();
                                            new Notice(`MathLinks: Template "${templateTitle}" deleted`);
                                            break;
                                        }
                                    }
                                }
                            };

                            modal.open();
                            this.display();
                        } else {
                            new Notice("MathLinks: Please select a template");
                        }
                    });
                return b;
            });

        // Add an excluded file
        new Setting(containerEl)
            .setName("Add an excluded file")
            .setDesc("MathLinks will ignore those files.")
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Add")
                    .setIcon("plus")
                    .onClick(async () => {
                        let modal = new AddExcludedModal(this.app, this.plugin.settings.excludedFilePaths);

                        modal.onClose = async () => {
                            if (modal.saved) {
                                const excludedFilePath = {
                                    path: modal.excludedFilePath,
                                    isFile: modal.isFile
                                }

                                this.plugin.settings.excludedFilePaths.push(excludedFilePath);
                                await this.plugin.saveSettings();

                                if (modal.isFile)
                                    new Notice("MathLinks: File excluded");
                                else
                                    new Notice("MathLinks: Path exclcuded");
                            }
                        };

                        modal.open();
                        this.display();
                    });
                return b;
            });

        // Remove from excluded files
        let excludedFilePath: string | null;
        new Setting(containerEl)
            .setName("Remove from excluded files")
            .setDesc("Remove a file from the list of excluded files.")
            .addDropdown(async (dropdown: DropdownComponent) => {
                dropdown.addOption("__select", "Select");
                this.plugin.settings.excludedFilePaths.forEach((excludedFilePath) => {
                    dropdown.addOption(excludedFilePath.path, excludedFilePath.path);
                })
                dropdown.onChange(async (current) => {
                    if (current != "__select")
                        excludedFilePath = current;
                    else
                        excludedFilePath = null;
                });
            })
            .addExtraButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Remove")
                    .setIcon("trash")
                    .onClick(async () => {
                        if (excludedFilePath) {
                            let modal = new ConfirmModal(this.app, `Are you sure you want to remove "${excludedFilePath}" from the list of excluded files/paths?`, "Yes", "No");

                            modal.onClose = async () => {
                                if (modal.saved) {
                                    for (let i = 0; i < this.plugin.settings.excludedFilePaths.length; i++) {
                                        if (this.plugin.settings.excludedFilePaths[i].path == excludedFilePath) {
                                            this.plugin.settings.excludedFilePaths.splice(i, 1);
                                            await this.plugin.saveSettings();
                                            new Notice(`MathLinks: "${excludedFilePath}" removed from excluded files`);
                                            break;
                                        }
                                    }
                                }
                            };

                            modal.open();
                            this.display();
                        } else {
                            new Notice("MathLinks: Please select a file");
                        }
                    });
                return b;
            });

        // Enable API
        new Setting(containerEl)
            .setName("Enable MathLinks API")
            .setDesc(
                createFragment((e) => {
                    let accounts = this.plugin.apiAccounts;
                    e.createSpan({ text: "Allow other community plugins to use MathLinks." });
                    if (accounts.length) {
                        let list = e.createEl("ul");
                        for (let account of accounts) {
                            list.createEl("li", { text: account.manifest.name });
                        }    
                    }
                })
            ).addToggle((toggle: ToggleComponent) => {
                toggle.setValue(this.plugin.settings.enableAPI)
                    .onChange(async (value: boolean) => {
                        this.plugin.settings.enableAPI = value;
                        await this.plugin.saveSettings();
                    })
            });
    }
}

class AddTemplatesModal extends Modal {
    saved: boolean = false;
    error: string[] = ["MathLinks: Please enter a title", "MathLinks: Please enter a non-empty string to be replaced"];

    title: string = "";
    replaced: string = "";
    replacement: string = "";
    globalMatch: boolean = true;
    sensitive: boolean = true;
    word: boolean = true

    templates: string[] = [];

    constructor(app: App, templates: string[]) {
        super(app);
        this.templates = templates;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        loadTemplateSettings(contentEl, this, this, "add");
        loadButtonsToClose(this, this.contentEl.createDiv(), "Add", "Cancel");
    }
}

class EditTemplatesModal extends Modal {
    saved: boolean = false;
    error: string[] = ["", ""];

    templateTitle: string;
    templates: string[];

    constructor(app: App, templateTitle: string, templates: string[]) {
        super(app);
        this.templateTitle = templateTitle;
        this.templates = templates;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        this.templates.every((template) => {
            if (this.templateTitle != undefined && template.title == this.templateTitle) {
                loadTemplateSettings(contentEl, template, this, "edit");
                return false;
            }
            return true;
        });

        loadButtonsToClose(this, this.contentEl.createDiv(), "Save", "Cancel");
    }
}

class AddExcludedModal extends Modal {
    saved: boolean = false;
    error: string[] = ["MathLinks: Please enter a valid file/path", ""];

    excludedFilePath: string;
    isFile: boolean;

    excludedFilePaths: string[];

    constructor(app: App, excludedFilePaths: string[]) {
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
                            this.excludedFilePath = file.path;
                            this.isFile = file instanceof TFile;
                            this.error[0] = "";
                        } else {
                            this.error[0] = "MathLinks: Please enter a valid file/path";
                        }

                        this.error[1] = "";
                        this.excludedFilePaths.every((path) => {
                            if (path.path == current) {
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

class ConfirmModal extends Modal {
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

function loadTemplateSettings(contentEl: HTMLElement, template: string, modal: Modal, modalType: string) {
    let titleText: TextComponent;
    new Setting(contentEl)
        .setName("Title")
        .setDesc("Name of the template.")
        .addText((text) => {
            titleText = text;
            titleText.setValue(template.title).onChange((current) => {
                template.title = current;
                modal.error[0] = "";
                if (modalType == "add") {
                    template.templates.every((t) => {
                        if (template.title != "" && template.title == t.title) {
                            modal.error[0] = "MathLinks: Duplicate title";
                            return false;
                        }
                        return true;
                    });
                }
                if (template.title == "") {
                    modal.error[0] = "MathLinks: Please enter a title";
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

function loadButtonsToClose(modal: Modal, element: HTMLElement, trueToolTip: string, falseToolTip: string) {
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
