window.__ModuleLoader__.load({
	id: "dsh-sidebar-panel-collapse",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

		var PLUGIN_ID = "dsh-sidebar-panel-collapse";
		/** `html[data-dsh-sidebar-panel-collapsed]` is the single source of truth the CSS keys on. */
		var ATTR = "data-dsh-sidebar-panel-collapsed";
		var STORAGE_KEY = PLUGIN_ID + ":collapsed";
		var TOGGLE_CLASS = "dshpc-toggle";
		var LABEL_CLASS = "dshpc-label";
		var CHEVRON_CLASS = "dshpc-chevron";
		/**
		 * CSS-module class names carry a build-local hash prefix (`wtg9ga_panelList`),
		 * so every selector matches on the stable local suffix only.
		 */
		var PANEL_LIST_SELECTOR = 'nav[class*="_panelList"]';
		var PANEL_ROW_SELECTOR = '[class*="_panelRow"]';
		/** The shell's own "new session" button; everything after it is entry territory. */
		var NEW_SESSION_SELECTOR = 'button[class*="_newSession"]';
		/**
		 * Some plugins skip the `sidebar.panellist` slot and append their own button to
		 * the sidebar column, so they would survive a `nav`-only collapse. Every such
		 * sibling between the new-session button and the panel list is marked with this
		 * class and hidden with the list.
		 */
		var EXTRA_CLASS = "dshpc-extra";

		var CSS = [
			"html[" + ATTR + '="1"] nav[class*="_panelList"]{display:none!important}',
			"html[" + ATTR + '="1"] .' + EXTRA_CLASS + "{display:none!important}",
			// Several plugins skip the sidebar.panellist slot and mount their entry button
			// wherever they like in the sidebar column (MUV inserts before the new-session
			// button, mnemon/muv-engine/better-sidebar append elsewhere). Each of them
			// stamps a stable data attribute on that button, so hide by attribute instead
			// of guessing at DOM positions.
			"html[" + ATTR + '="1"] [data-dsh-muv-entry]{display:none!important}',
			"html[" + ATTR + '="1"] [data-dsh-mnemon-entry]{display:none!important}',
			"html[" + ATTR + '="1"] [data-dsh-vr-entry]{display:none!important}',
			"html[" + ATTR + '="1"] [data-dsh-ctx-entry]{display:none!important}',
			"." + TOGGLE_CLASS + "{appearance:none;display:flex;align-items:center;justify-content:flex-end;gap:4px;",
			"width:100%;height:20px;margin:0 0 2px;padding:0 8px;border:0;border-radius:6px;",
			"background:transparent;color:inherit;font:inherit;font-size:11px;line-height:1;",
			"letter-spacing:.02em;cursor:pointer;opacity:.6;transition:opacity .12s ease,background-color .12s ease}",
			"." + TOGGLE_CLASS + ":hover{opacity:1;background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.12))}",
			"." + TOGGLE_CLASS + ":focus-visible{opacity:1;outline:2px solid var(--dsw-alias-border-focus,#4d6bfe);outline-offset:-2px}",
			"." + TOGGLE_CLASS + " ." + CHEVRON_CLASS + "{flex:none;display:inline-flex;transition:transform .16s ease}",
			"html[" + ATTR + '="1"] .' + TOGGLE_CLASS + " ." + CHEVRON_CLASS + "{transform:rotate(-90deg)}",
			// The shell already hides the panel list on the collapsed rail; drop our row there too.
			'[class*="_collapsed"] .' + TOGGLE_CLASS + "{display:none!important}"
		].join("");

		var CHEVRON_SVG = '<svg class="' + CHEVRON_CLASS + '" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">' +
			'<path d="M1.5 3.25 5 6.75l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

		var toggleEl = null;
		var observer = null;
		var frame = 0;
		var collapsed = false;

		function isChinese() {
			var lang = (document.documentElement.getAttribute("lang") || navigator.language || "").toLowerCase();
			return lang.indexOf("zh") === 0;
		}

		function labelFor(value) {
			if (isChinese()) return value ? "展开面板" : "收起面板";
			return value ? "Expand panels" : "Collapse panels";
		}

		/**
		 * The package used to be called `dsh-panel-collapse`; carry a stored preference
		 * over to the new key once so renaming does not silently reset the sidebar.
		 */
		var LEGACY_STORAGE_KEY = "dsh-panel-collapse:collapsed";

		function readStored() {
			try {
				var current = window.localStorage.getItem(STORAGE_KEY);
				if (current === null) {
					var legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
					if (legacy !== null) {
						window.localStorage.setItem(STORAGE_KEY, legacy === "1" ? "1" : "0");
						return legacy === "1";
					}
					return false;
				}
				return current === "1";
			} catch (error) {
				return false;
			}
		}

		function store(value) {
			try {
				window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
			} catch (error) {
				/* private mode: keep the in-memory state only */
			}
		}

		/**
		 * Inject (or refresh) the plugin stylesheet. A hot-swapped bundle re-runs `apply`
		 * while the previous `<style>` node is still in the document, so reusing the tag
		 * has to UPDATE its text — returning early on a matching key would keep serving
		 * the old rules forever.
		 */
		function injectCSS() {
			var style = document.querySelector('style[data-plugin-css="' + PLUGIN_ID + '/toggle.css"]');
			if (style === null) {
				style = document.createElement("style");
				style.dataset.pluginCss = PLUGIN_ID + "/toggle.css";
				document.head.appendChild(style);
			}
			if (style.textContent !== CSS) style.textContent = CSS;
		}

		/** The panel list is the one `<nav>` that actually holds panel rows. */
		function panelList() {
			var nodes = document.querySelectorAll(PANEL_LIST_SELECTOR);
			for (var index = 0; index < nodes.length; index += 1) {
				if (nodes[index].querySelector(PANEL_ROW_SELECTOR) !== null) return nodes[index];
			}
			return nodes.length > 0 ? nodes[0] : null;
		}

		/**
		 * Some plugins skip the `sidebar.panellist` slot and mount their entry button
		 * wherever they like in the sidebar column — dsh-muv-table inserts it next to the
		 * logo row, dsh-mnemon/dsh-muv-engine/dsh-better-sidebar append theirs elsewhere.
		 * None of them use the shell's `<nav>`, and their nesting depth differs, so a
		 * sibling walk is not enough. Instead scan the whole sidebar column for buttons
		 * and mark every one that is not part of a region the collapse must keep: the
		 * brand row (which holds the shell's own rail toggle), the panel list, the
		 * workspace region and the footer.
		 */
		function markExtras(nav) {
			var root = nav.parentElement;
			if (root === null) return;
			var column = nav.closest('[class*="_sidebarCol"]') || root;
			/** Regions of the shell that must stay interactive while collapsed. */
			var KEEP_SELECTOR = '[class*="_logoRow"],[class*="_panelList"],[class*="_regionArea"],[class*="_footArea"],[class*="_topStrip"],[class*="_railIn"]';
			var marked = [];
			var buttons = column.querySelectorAll("button");
			for (var index = 0; index < buttons.length; index += 1) {
				var node = buttons[index];
				if (node === toggleEl || node === nav) continue;
				if (node.matches(NEW_SESSION_SELECTOR)) continue;
				// Keep anything belonging to a shell region, including this button's own
				// ancestors, so the brand/rail toggle and workspace rows stay usable.
				if (node.closest(KEEP_SELECTOR) !== null) continue;
				marked.push(node);
				if (!node.classList.contains(EXTRA_CLASS)) node.classList.add(EXTRA_CLASS);
			}
			var stale = column.querySelectorAll("." + EXTRA_CLASS);
			for (var s = 0; s < stale.length; s += 1) {
				if (marked.indexOf(stale[s]) === -1) stale[s].classList.remove(EXTRA_CLASS);
			}
		}

		function syncToggle() {
			if (toggleEl === null) return;
			toggleEl.setAttribute("aria-expanded", collapsed ? "false" : "true");
			toggleEl.title = labelFor(collapsed);
			toggleEl.setAttribute("aria-label", labelFor(collapsed));
			var label = toggleEl.querySelector("." + LABEL_CLASS);
			if (label !== null) label.textContent = labelFor(collapsed);
		}

		function setCollapsed(value) {
			collapsed = value === true;
			document.documentElement.setAttribute(ATTR, collapsed ? "1" : "0");
			store(collapsed);
			syncToggle();
		}

		function createToggle() {
			var button = document.createElement("button");
			button.type = "button";
			button.className = TOGGLE_CLASS;
			button.setAttribute("aria-controls", "dsh-panel-list");
			button.appendChild(document.createElement("span")).className = LABEL_CLASS;
			var glyph = document.createElement("span");
			glyph.className = "dshpc-glyph";
			glyph.setAttribute("aria-hidden", "true");
			glyph.appendChild(document.createRange().createContextualFragment(CHEVRON_SVG));
			button.appendChild(glyph);
			button.addEventListener("click", function (event) {
				event.preventDefault();
				event.stopPropagation();
				setCollapsed(!collapsed);
			});
			return button;
		}

		/**
		 * The toggle belongs at the top of the entry block, directly under the new-session
		 * button, so it reads as controlling everything below it rather than only the
		 * slot-rendered rows. That anchor is the first marked entry or the panel list,
		 * whichever comes first.
		 */
		function toggleAnchor(nav) {
			var root = nav.parentElement;
			var children = root.children;
			for (var index = 0; index < children.length; index += 1) {
				var node = children[index];
				if (node === nav) return nav;
				if (node === toggleEl) continue;
				if (node.classList.contains(EXTRA_CLASS)) return node;
			}
			return nav;
		}

		/** Keep exactly one toggle at the top of the entry block, surviving React re-renders. */
		function ensureToggle() {
			var nav = panelList();
			if (nav === null || nav.parentElement === null) return;
			if (toggleEl === null) toggleEl = createToggle();
			if (nav.id !== "dsh-panel-list") nav.id = "dsh-panel-list";
			// Mark first: the anchor search reads the marks it produces.
			markExtras(nav);
			var anchor = toggleAnchor(nav);
			if (toggleEl.parentElement !== nav.parentElement || toggleEl.nextElementSibling !== anchor) {
				nav.parentElement.insertBefore(toggleEl, anchor);
			}
			syncToggle();
		}


		function schedule() {
			if (frame !== 0) return;
			frame = window.requestAnimationFrame(function () {
				frame = 0;
				try {
					ensureToggle();
				} catch (error) {
					/* a detached sidebar must never break the app */
				}
			});
		}

		exports.apply = function apply(ctx) {
			if (typeof document === "undefined") return;

			injectCSS();
			collapsed = readStored();
			document.documentElement.setAttribute(ATTR, collapsed ? "1" : "0");

			var dispose = function () {
				if (observer !== null) observer.disconnect();
				observer = null;
				if (frame !== 0) window.cancelAnimationFrame(frame);
				frame = 0;
				if (toggleEl !== null && toggleEl.parentElement !== null) toggleEl.remove();
				toggleEl = null;
				document.documentElement.removeAttribute(ATTR);
			};

			observer = new MutationObserver(schedule);
			observer.observe(document.body, { childList: true, subtree: true });
			schedule();

			if (typeof ctx.effect === "function") {
				ctx.effect(() => dispose, PLUGIN_ID + ": sidebar panel toggle");
			}
		};

		return module.exports;
	}
});

