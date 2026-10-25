import { FuzzySuggestModal, type App, type FuzzyMatch } from 'obsidian';

export class FolderExclusionPickerModal extends FuzzySuggestModal<string> {
  private resolvePromise!: (value: string | null) => void;
  private resolved = false;

  constructor(
    app: App,
    private readonly folderPaths: string[],
  ) {
    super(app);
    this.setPlaceholder('Type to search vault folders…');
  }

  onClose(): void {
    if (!this.resolved) {
      this.resolvePromise(null);
      this.resolved = true;
    }
    super.onClose();
  }

  openModal(): Promise<string | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      super.open();
    });
  }

  getItems(): string[] {
    return this.folderPaths;
  }

  getItemText(folderPath: string): string {
    return folderPath;
  }

  /**
   * Obsidian core closes the modal *before* it delivers the chosen item
   * (SuggestModal.selectSuggestion → close() → onChooseSuggestion()). Without
   * this override, onClose() would resolve the promise with null first and the
   * real selection in onChooseItem() would land on an already-settled promise.
   */
  selectSuggestion(value: FuzzyMatch<string>, evt: MouseEvent | KeyboardEvent): void {
    this.resolved = true;
    super.selectSuggestion(value, evt);
  }

  onChooseItem(folderPath: string): void {
    this.resolved = true;
    this.resolvePromise(folderPath);
  }
}
