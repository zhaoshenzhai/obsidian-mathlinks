import { Setting, PluginSettingTab, Modal, TextComponent } from 'obsidian';

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
            .setName('Add a new MathLink template')
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
                                    sensitive: modal.sensitive
                                };

                                this.plugin.settings.templates.push(template);
                                await this.plugin.saveSettings();
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
    sensitive: boolean = true;

    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;

        let replacedText: TextComponent;
        new Setting(contentEl)
            .setName('Replace all ...')
            .setDesc('Strings to be matched and replaced. Regex (without slashes or flags) recommended.')
            .addText((text) => {
                replacedText = text;
                replacedText.setValue(this.replaced).onChange((current) => {
                    this.replaced = current;
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
            .setName('Case insensitive')
            .setDesc('Matches will be case insensitive.')
            .addToggle((toggle) => {
                toggle.setValue(this.sensitive).onChange((current) => (this.sensitive = !current));
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
