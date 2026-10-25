import esbuild from "esbuild";
import { copyFile, mkdir } from "node:fs/promises";

const prod = process.argv[2] === "production";

await mkdir("dist", { recursive: true });
const copyStatic = () => Promise.all(["manifest.json", "styles.css"].map((f) => copyFile(f, `dist/${f}`)));

const plugin = {
	entryPoints: { main: "src/main.ts" },
	outdir: "dist",
	format: "cjs",
	bundle: true,
	target: "es2018",
	platform: "node",
	logLevel: "info",
	treeShaking: true,
	sourcemap: prod ? false : "inline",
	minify: prod,
	external: ["electron", "obsidian", "crypto", "@xenova/transformers", "@huggingface/transformers", "http", "url", "node:sqlite"],
	plugins: [{ name: "copy-static", setup: (b) => b.onEnd(async () => { await copyStatic(); }) }],
};

// Standalone MCP server: Node-only, must never import obsidian (the build fails if it does).
const mcp = {
	entryPoints: { mcp: "src/mcp/entry.ts" },
	outdir: "dist",
	format: "esm",
	bundle: true,
	target: "es2022",
	platform: "node",
	logLevel: "info",
	treeShaking: true,
	minify: prod,
	external: ["node:*"],
	banner: { js: "#!/usr/bin/env node" },
};

const contexts = await Promise.all([esbuild.context(plugin), esbuild.context(mcp)]);
if (prod) {
	await Promise.all(contexts.map((c) => c.rebuild()));
	await Promise.all(contexts.map((c) => c.dispose()));
} else {
	await Promise.all(contexts.map((c) => c.watch()));
}
