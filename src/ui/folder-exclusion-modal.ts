import { FuzzySuggestModal, TFolder, type App, type FuzzyMatch } from 'obsidian';

export class FolderExclusionPickerModal extends FuzzySuggestModal<string> {
  private resolvePromise!: (value: string | null) => void;
  private resolved = false;

  constructor(
    app: App,
    private readonly excludedPaths: string[],
  ) {
    super(app);
    this.setPlaceholder('Type a folder path; add / to look inside');
    this.emptyStateText = 'No folder here. Type a parent path followed by /.';
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

  /** Lists only the typed parent folder and its direct subfolders, never the whole vault. */
  getItems(): string[] {
    const query = this.inputEl.value;
    const slash = query.lastIndexOf('/');
    const parentPath = slash > 0 ? query.slice(0, slash) : '';
    const parent = parentPath ? this.app.vault.getFolderByPath(parentPath) : this.app.vault.getRoot();
    if (!parent) return [];
    const paths = parent.children
      .filter((child): child is TFolder => child instanceof TFolder)
      .map((folder) => folder.path);
    if (!parent.isRoot()) paths.unshift(parent.path);
    return paths.filter((path) => !this.excludedPaths.includes(path));
  }

  getItemText(folderPath: string): string {
    return `${folderPath}/`;
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
