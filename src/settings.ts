import { Setting, PluginSettingTab, Modal, TextComponent, Notice } from 'obsidian';
import { formatToRegex } from './utils';

export class MathLinksSettingTab extends PluginSettingTab {
    plugin: MathLinks;

    constructor(app: App, plugin: MathLinks) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', {text: 'MathLinks Settings'});

        new Setting(containerEl)
            .setName('Add a new template')
            .setDesc(
                createFragment((e) => {
                    e.createSpan({
                        text: 'Automatically generate a mathLink with templates. Use '
                    });
                    e.createEl('code', {
                        text: 'mathLink: auto'
                    });
                    e.createSpan({
                        text: ' to use templates in a file.'
                    });
                })
            )
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Add")
                    .setButtonText("+")
                    .onClick(async () => {
                        let modal = new AddTemplatesModal(this.app);

                        modal.onClose = async () => {
                            if (modal.saved) {
                                const template = {
                                    replaced: modal.replaced,
                                    replacement: modal.replacement,
                                    globalMatch: modal.globalMatch,
                                    sensitive: modal.sensitive,
                                    word: modal.word
                                };

                                this.plugin.settings.templates.push(template);
                                await this.plugin.saveSettings();
                                new Notice('MathLink template added');
                            }
                        };

                        modal.open();
                    });
                return b;
            });

        new Setting(containerEl)
            .setName('Edit templates')
            .setDesc('Opens a modal to edit existing templates.')
            .addButton((button: ButtonComponent): ButtonComponent => {
                let b = button
                    .setTooltip("Edit")
                    .setIcon("edit")
                    .onClick(async () => {
                        let currentTemplates = this.plugin.settings.templates.slice();
                        let modal = new EditTemplatesModal(this.app, currentTemplates);

                        modal.onClose = async () => {
                            if (modal.saved) {
                                await this.plugin.saveSettings();
                                new Notice('MathLink templates saved');
                            }
                        };

                        modal.open();
                    });
                return b;
            });
    }
}

class AddTemplatesModal extends Modal {
    saved: boolean = false;

    replaced: string = '';
    replacement: string = '';

    globalMatch: boolean = true;
    sensitive: boolean = true;
    word: boolean = true

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        let replacedText: TextComponent;
        new Setting(contentEl)
            .setName('Replace all ...')
            .setDesc('Strings to be matched and replaced.')
            .addText((text) => {
                replacedText = text;
                replacedText.setValue(this.replaced).onChange((current) => {
                    this.replaced = formatToRegex(current);
                });
            });

        let replacementText: TextComponent;
        new Setting(contentEl)
            .setName('... with')
            .setDesc('String to replace all matches. Do not escape backslashes.')
            .addText((text) => {
                replacementText = text;
                replacementText.setValue(this.replacement).onChange((current) => {
                    this.replacement = current;
                });
            });

        new Setting(contentEl)
            .setName('Global')
            .setDesc('Match all instances (instead of just the first)')
            .addToggle((toggle) => {
                toggle.setValue(true).onChange((current) => (this.globalMatch = current));
            });

        new Setting(contentEl)
            .setName('Case sensitive')
            .setDesc('Matches will be case sensitive.')
            .addToggle((toggle) => {
                toggle.setValue(true).onChange((current) => (this.sensitive = current));
            });

        new Setting(contentEl)
            .setName('Whole word')
            .setDesc('Only match whole words.')
            .addToggle((toggle) => {
                toggle.setValue(true).onChange((current) => (this.word = current));
            });

        let footerEl = contentEl.createDiv();
        let footerButtons = new Setting(footerEl);
        footerButtons.addButton((b) => {
            b.setTooltip("Save")
                .setIcon("checkmark")
                .onClick(async () => {
                    this.saved = true;
                    this.close();
                });
            return b;
        });
        footerButtons.addExtraButton((b) => {
            b.setTooltip("Cancel")
                .setIcon("cross")
                .onClick(() => {
                    this.saved = false;
                    this.close();
                });
            return b;
        });
    }
}

class EditTemplatesModal extends Modal {
    saved: boolean = false;
    templates: string[];

    constructor(app: App, templates: string[]) {
        super(app);
        this.templates = templates.slice();
    }

    onOpen() {
        const { contentEl } = this;
        let templates = this.templates;

        contentEl.createEl('h2', {text: 'Edit templates'});

        for (let i = 0; i < templates.length; i++) {
            let replacedText: TextComponent;
            let replacementText: TextComponent;
            new Setting(contentEl)
                .setDesc('Replace all... with ... Case sensitive?')
                .addText((text) => {
                    replacedText = text;
                    replacedText.setPlaceholder(templates[i].replaced);
                    replacedText.setValue(templates[i].replaced).onChange((current) => {
                        templates[i].replaced = current;
                    });
                })
                .addText((text) => {
                    replacementText = text;
                    replacementText.setPlaceholder(templates[i].replacement);
                    replacementText.setValue(templates[i].replacement).onChange((current) => {
                        templates[i].replacement = current;
                    });
                })
                .addToggle((toggle) => {
                    toggle.setValue(templates[i].sensitive).onChange((current) => (templates[i].sensitive = current));
                })
                .addToggle((toggle) => {
                    toggle.setValue(templates[i].globalMatch).onChange((current) => (templates[i].globalMatch = current));
                })
                .addToggle((toggle) => {
                    toggle.setValue(templates[i].word).onChange((current) => (templates[i].word = current));
                });
        }

        let footerEl = contentEl.createDiv();
        let footerButtons = new Setting(footerEl);
        footerButtons.addButton((b) => {
            b.setTooltip("Save")
                .setIcon("checkmark")
                .onClick(async () => {
                    this.saved = true;
                    this.close();
                });
            return b;
        });
        footerButtons.addExtraButton((b) => {
            b.setTooltip("Cancel")
                .setIcon("cross")
                .onClick(() => {
                    this.saved = false;
                    this.close();
                });
            return b;
        });
    }
}
