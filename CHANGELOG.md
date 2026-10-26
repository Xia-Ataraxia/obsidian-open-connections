# Changelog

## 3.10.0

Open Connections no longer lists every file in your vault or touches the clipboard, which clears the Community scan's Vault Enumeration and Clipboard Access recommendations.

### Changed

- **Indexing is on demand.** Notes are indexed when you open, create, or edit them. To index a group of notes, right-click a folder and choose **Index notes for connections**, or click **Index this folder** in the Connections view when a note has no related notes yet.
- **Folder exclusion picker** lists the subfolders of the path you type (`Music/` shows Music and its subfolders) instead of searching every folder in the vault.
- **Copy connections as smart context** is now **Insert connections as smart context**: it inserts the list at the cursor.
- **Copy link** in the result menu is now **Insert link**: it inserts the link at the cursor of the note you're editing.
- **MCP authentication token**: the Copy button is gone. The read-only field selects the whole token when you click it, so you can copy it with Cmd/Ctrl+C.

### Removed

- **Whole-vault discovery on first run.** New vaults start with an empty index that grows as you work. Existing indexes and databases are kept as they are.
