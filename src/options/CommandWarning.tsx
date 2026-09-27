import { useEffect, useRef, useState } from "react"
import { gvar } from "@/globalVar"
import { Keybind } from "../types"
import { requestCreateTab } from "../utils/browserUtils"
import { WarningBanner } from "./WarningBanner"

type Props = {
	keybinds: Keybind[]
}

export function CommandWarning(props: Props) {
	const [show, setShow] = useState(false)

	const env = useRef({} as { keybinds?: Keybind[]; show?: boolean }).current
	env.show = show
	env.keybinds = props.keybinds

	useEffect(() => {
		const refresh = () => {
			chrome.commands.getAll((cc) => {
				const target = cc.some(
					(c) => c.name.startsWith("command") && c.shortcut && !env.keybinds.some((kb) => kb.enabled && (kb.globalKey || "commandA") === c.name),
				)
				target !== env.show && setShow(target)
			})
		}

		const onVisibility = () => {
			document.visibilityState === "visible" && refresh()
		}

		// Shortcut bindings change either here (keybind edits land in storage.local) or in the
		// external chrome://extensions shortcuts table (which this page only sees on refocus).
		// Refresh on those events; a slow interval remains as a safety net for cross-window edits.
		refresh()
		chrome.storage.local.onChanged.addListener(refresh)
		window.addEventListener("focus", refresh)
		document.addEventListener("visibilitychange", onVisibility)
		const intervalId = setInterval(refresh, 10_000)

		return () => {
			chrome.storage.local.onChanged.removeListener(refresh)
			window.removeEventListener("focus", refresh)
			document.removeEventListener("visibilitychange", onVisibility)
			clearInterval(intervalId)
		}
	}, [])

	if (!show) return null

	return (
		<WarningBanner
			action={{
				label: gvar.gsm.token.openPage,
				onClick: () => requestCreateTab(`chrome://extensions/shortcuts#:~:text=${encodeURIComponent("Global Speed")}`),
			}}
		>
			{gvar.gsm.warnings.unusedGlobal}
		</WarningBanner>
	)
}
