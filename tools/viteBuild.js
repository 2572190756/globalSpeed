// /// <reference types="@types/node" />

import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { build } from "vite"
import { pageConfig, scriptConfig } from "../vite.config.js"

const projectRoot = resolve(import.meta.dirname, "..")
const firefox = process.env.FIREFOX === "true"
const production = process.env.NODE_ENV === "production"
const buildRoot = resolve(projectRoot, firefox ? "buildFf" : "build")
const outDir = resolve(buildRoot, "unpacked")

/**
 * The manifest uses default_locale + __MSG_appName__/__MSG_appDesc__, so Chrome
 * requires a _locales/<code>/messages.json subtree; without it the unpacked
 * extension is refused with "Default locale was specified, but _locales subtree
 * is missing". The runtime i18n loader reads static/locales/*.json at runtime
 * (via chrome.runtime.getURL("locales/...")), so that folder is kept as-is and
 * this generates the Chrome-required _locales copy from the same sources.
 */
function generateLocales(outDir, projectRoot) {
	const localesDir = resolve(projectRoot, "static", "locales")
	const outLocales = resolve(outDir, "_locales")
	for (const file of readdirSync(localesDir).filter((f) => f.endsWith(".json"))) {
		const code = file.slice(0, -".json".length)
		const data = JSON.parse(readFileSync(resolve(localesDir, file), "utf8"))
		const messages = {
			appName: { message: data[":appName"] || "Global Speed" },
			appDesc: { message: data[":appDesc"] || "" },
		}
		const dir = resolve(outLocales, code)
		mkdirSync(dir, { recursive: true })
		writeFileSync(resolve(dir, "messages.json"), JSON.stringify(messages, null, "\t"))
	}
}

async function main() {
	if (![resolve(projectRoot, "build"), resolve(projectRoot, "buildFf")].includes(buildRoot)) {
		throw new Error(`Refusing to clear unexpected build path: ${buildRoot}`)
	}

	rmSync(buildRoot, { recursive: true, force: true })
	mkdirSync(outDir, { recursive: true })
	cpSync(resolve(projectRoot, "static"), outDir, { recursive: true })
	cpSync(resolve(projectRoot, firefox ? "staticFf" : "staticCh"), outDir, { recursive: true })
	generateLocales(outDir, projectRoot)

	const mode = production ? "production" : "development"
	const run = (config) => build({ ...config, configFile: false, mode })

	await run(pageConfig({ firefox, outDir, production }))
	if (!firefox) await run(pageConfig({ firefox, outDir, production, chromiumOffscreen: true }))

	const names = ["isolated", "background", "main", "pageDraw", "pane", "itcPanel"]
	if (firefox) names.push("mainLoader")
	else names.push("sound-touch-processor", "reverse-sound-processor")

	for (const name of names) {
		await run(scriptConfig({ name, firefox, outDir, production }))
	}
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
