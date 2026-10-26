import { App, ButtonComponent, Modal } from 'obsidian';

export interface ConfirmOptions {
  title?: string;
  cta?: string;
  warning?: boolean;
}

class ConfirmModal extends Modal {
  result = false;
  private resolvePromise!: (value: boolean) => void;

  constructor(app: App, private readonly message: string, private readonly options: ConfirmOptions) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    if (this.options.title) this.setTitle(this.options.title);
    contentEl.createEl('p', { cls: 'osc-confirm-message', text: this.message });

    const buttonDiv = contentEl.createDiv({ cls: 'modal-button-container' });
    new ButtonComponent(buttonDiv).setButtonText('Cancel').onClick(() => {
      this.result = false;
      this.close();
    });
    const confirm = new ButtonComponent(buttonDiv)
      .setButtonText(this.options.cta ?? 'Confirm')
      .onClick(() => {
        this.result = true;
        this.close();
      });
    if (this.options.warning) confirm.setDestructive();
    confirm.setCta();
  }

  onClose(): void {
    this.contentEl.empty();
    this.resolvePromise(this.result);
  }

  openModal(): Promise<boolean> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      super.open();
    });
  }
}

export async function confirmWithModal(app: App, message: string, options: ConfirmOptions = {}): Promise<boolean> {
  return new ConfirmModal(app, message, options).openModal();
}
