export class StratumServer {
	parasite: HTMLDivElement
	wiggleCbs = new Set<(target: Node & ParentNode) => void>()
	msgCbs = new Set<(data: any) => void>()
	initCbs = new Set<() => void>()
	#serverName: string
	#clientName: string
	initialized = false

	constructor() {
		window.addEventListener("GS_INIT", this.handleInit, { capture: true, once: true })
	}
	handleInit = (e: CustomEvent) => {
		// The channel bus is the parasite div itself (the client keeps it detached after
		// pairing, so page scripts cannot obtain a reference to it). No open shadow root
		// is involved, which removes the persistent eavesdropping/injection surface.
		if (!(e.target instanceof HTMLDivElement && e.target.id === "GS_PARASITE" && e.target.isConnected)) return
		this.parasite = e.target
		this.#serverName = `GS_SERVER_${e.detail}`
		this.#clientName = `GS_CLIENT_${e.detail}`

		this.parasite.addEventListener(this.#serverName, this.handle, { capture: true })

		this.initCbs.forEach((cb) => cb())
		this.initCbs.clear()
		this.initialized = true
	}
	handle = (e: CustomEvent) => {
		e.stopImmediatePropagation()
		let detail: any
		try {
			detail = JSON.parse(e.detail)
		} catch (err) {}
		if (!detail) return

		if (detail.type === "WIGGLE") {
			const parent = this.parasite.parentNode
			if (parent) {
				this.parasite.remove()
				this.wiggleCbs.forEach((cb) => cb(parent))
			}
		} else if (detail.type === "MSG") {
			this.msgCbs.forEach((cb) => cb(detail.data || {}))
		}
	}
	send = (data: any) => {
		this.parasite.dispatchEvent(new CustomEvent(this.#clientName, { detail: JSON.stringify(data) }))
	}
}
