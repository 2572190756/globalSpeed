import type { KeyboardEvent as ReactKeyboardEvent } from "react"

/**
 * Keyboard activation for elements that are made clickable with role="button"
 * (native <button> and Base UI Button already handle Enter/Space themselves).
 * Returns an onKeyDown handler that forwards Enter/Space presses to the given
 * activation callback.
 */
export function activateOnKeyDown(activate?: (e: ReactKeyboardEvent<Element>) => void) {
	return (e: ReactKeyboardEvent<Element>) => {
		if (e.key !== "Enter" && e.key !== " ") return
		e.preventDefault()
		activate?.(e)
	}
}
