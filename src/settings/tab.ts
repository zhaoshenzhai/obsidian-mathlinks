import { Setting, PluginSettingTab, Notice, App } from "obsidian";
import { TextComponent, DropdownComponent, ToggleComponent, ButtonComponent, ExtraButtonComponent } from "obsidian"
import { ConfirmModal, AddExcludedModal, AddTemplatesModal, EditTemplatesModal } from "./modals"
import MathLinks from "../main"

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
                return button.setTooltip("Add").setIcon("plus").onClick(async () => {
                    let modal = new AddTemplatesModal(this.app, this.plugin.settings.templates);
                    modal.open();
                    modal.onClose = async () => {
                        if (modal.saved) {
                            this.plugin.settings.templates.push(modal.newTemplate);
                            await this.plugin.saveSettings().then(() => {
                                new Notice("MathLinks: Template added");
                                this.display();
                            });
                        }
                    };
                });
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
                return button.setTooltip("Edit").setIcon("edit").onClick(async () => {
                    if (templateTitle) {
                        let modal = new EditTemplatesModal(this.app, templateTitle, this.plugin.settings.templates);
                        modal.open();
                        modal.onClose = async () => {
                            if (modal.saved) {
                                await this.plugin.saveSettings().then(() => {
                                    new Notice("MathLinks: Template saved");
                                    this.display();
                                });
                            }
                        };
                    } else {
                        new Notice("MathLinks: Please select a template");
                    }
                });
            })
            .addExtraButton((button: ExtraButtonComponent): ExtraButtonComponent => {
                return button.setTooltip("Delete").setIcon("trash").onClick(async () => {
                    if (templateTitle) {
                        let modal = new ConfirmModal(this.app, `Are you sure you want to delete "${templateTitle}"?`, "Yes", "No");
                        modal.open();
                        modal.onClose = async () => {
                            if (modal.saved) {
                                for (let i = 0; i < this.plugin.settings.templates.length; i++) {
                                    if (this.plugin.settings.templates[i].title == templateTitle) {
                                        this.plugin.settings.templates.splice(i, 1);
                                        await this.plugin.saveSettings().then(() => {
                                            this.display();
                                            new Notice(`MathLinks: Template "${templateTitle}" deleted`);
                                        });
                                        break;
                                    }
                                }
                            }
                        };
                    } else {
                        new Notice("MathLinks: Please select a template");
                    }
                });
            });

        // Add an excluded file
        new Setting(containerEl)
            .setName("Add an excluded file")
            .setDesc("MathLinks will ignore those files.")
            .addButton((button: ButtonComponent): ButtonComponent => {
                return button.setTooltip("Add").setIcon("plus").onClick(async () => {
                    let modal = new AddExcludedModal(this.app, this.plugin.settings.excludedFilePaths);
                    modal.open();
                    modal.onClose = async () => {
                        if (modal.saved) {
                            this.plugin.settings.excludedFilePaths.push(modal.newExcludedFilePath);
                            await this.plugin.saveSettings().then(() => {
                                this.display();
                                if (modal.newExcludedFilePath.isFile)
                                    new Notice("MathLinks: File excluded");
                                else
                                    new Notice("MathLinks: Path exclcuded");
                            });
                        }
                    };
                });
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
            .addExtraButton((button: ExtraButtonComponent): ExtraButtonComponent => {
                return button.setTooltip("Remove").setIcon("trash").onClick(async () => {
                    if (excludedFilePath) {
                        let modal = new ConfirmModal(this.app, `Are you sure you want to remove "${excludedFilePath}" from the list of excluded files/paths?`, "Yes", "No");
                        modal.open();
                        modal.onClose = async () => {
                            if (modal.saved) {
                                for (let i = 0; i < this.plugin.settings.excludedFilePaths.length; i++) {
                                    if (this.plugin.settings.excludedFilePaths[i].path == excludedFilePath) {
                                        this.plugin.settings.excludedFilePaths.splice(i, 1);
                                        await this.plugin.saveSettings().then(() => {
                                            this.display();
                                            new Notice(`MathLinks: "${excludedFilePath}" removed from excluded files`);
                                        });
                                        break;
                                    }
                                }
                            }
                        };
                    } else {
                        new Notice("MathLinks: Please select a file");
                    }
                });
            });

        // Block links
        let prefix: TextComponent;
        new Setting(containerEl)
            .setName("Edit prefix for block links")
            .setDesc(
                createFragment((e) => {
                    e.createSpan({ text: "Links like " });
                    e.createEl("code", { text: "note#^block-id" });
                    e.createSpan({ text: " will be rendered as" });
                    if (this.plugin.settings.enableFileNameBlockLinks) {
                        e.createEl("code", { text: "note > " + this.plugin.settings.blockPrefix + "block-id" });
                    } else {
                        e.createEl("code", { text: this.plugin.settings.blockPrefix + "block-id" });
                    }
                    e.createSpan({ text: "." });
                })
            )
            .addText((text) => {
                prefix = text;
                prefix.setValue(this.plugin.settings.blockPrefix).onChange(async (current: string) => {
                    this.plugin.settings.blockPrefix = current;
                    await this.plugin.saveSettings();
                });
                prefix.setPlaceholder("No prefix");
            })
            .addToggle((toggle: ToggleComponent) => {
                toggle.setValue(this.plugin.settings.enableFileNameBlockLinks)
                    .onChange(async (value: boolean) => {
                        this.plugin.settings.enableFileNameBlockLinks = value;
                        await this.plugin.saveSettings();
                    });
                toggle.setTooltip("Disable to ignore note name.");
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
