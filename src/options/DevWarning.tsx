import { useEffect, useRef, useState } from "react"
import { gvar } from "@/globalVar"
import { requestCreateTab } from "../utils/browserUtils"
import { canPotentiallyUserScriptExecute, canUserScript } from "../utils/userScriptSupport"
import { WarningBanner } from "./WarningBanner"

export enum DevWarningType {
	NONE = 0,
	ENABLE_USERSCRIPTS = 1,
	NO_SUPPORT = 2,
}

export function useDevWarningType(hasJs: boolean): DevWarningType {
	const [type, setType] = useState(DevWarningType.NONE)
	const env = useRef({} as { type: DevWarningType }).current
	env.type = type

	useEffect(() => {
		if (!hasJs) {
			setType(DevWarningType.NONE)
			return
		}

		const refresh = () => {
			let target = DevWarningType.NO_SUPPORT
			if (canPotentiallyUserScriptExecute()) {
				target = canUserScript() ? DevWarningType.NONE : DevWarningType.ENABLE_USERSCRIPTS
			}

			target !== env.type && setType(target)
			env.type = target
		}

		const onVisibility = () => {
			document.visibilityState === "visible" && refresh()
		}

		// The "Allow user scripts" toggle lives in the external chrome://extensions page, so
		// this page can only observe it when it regains focus; refresh there and keep a slow
		// interval as a safety net for cross-window edits.
		refresh()
		window.addEventListener("focus", refresh)
		document.addEventListener("visibilitychange", onVisibility)
		const intervalId = setInterval(refresh, 2_000)

		return () => {
			window.removeEventListener("focus", refresh)
			document.removeEventListener("visibilitychange", onVisibility)
			clearInterval(intervalId)
		}
	}, [hasJs])

	return type
}

type Props = {
	forUrlRules?: boolean
} & (
	| {
			warningType: DevWarningType
			hasJs?: never
	  }
	| {
			hasJs?: boolean
			warningType?: never
	  }
)

export function DevWarning(props: Props) {
	const ownType = useDevWarningType(props.hasJs ?? false)
	const show = props.warningType ?? ownType

	if (!show) return null

	return (
		<WarningBanner
			action={
				show === DevWarningType.ENABLE_USERSCRIPTS
					? {
							label: gvar.gsm.token.openPage,
							onClick: () =>
								requestCreateTab(`chrome://extensions/?id=${chrome.runtime.id}#:~:text=${encodeURIComponent("allow user scripts")}`),
						}
					: undefined
			}
		>
			{show === DevWarningType.ENABLE_USERSCRIPTS
				? gvar.gsm.warnings[props.forUrlRules ? "jsWarningRules" : "jsWarning"]
				: gvar.gsm.warnings.jsUpdate}
		</WarningBanner>
	)
}
