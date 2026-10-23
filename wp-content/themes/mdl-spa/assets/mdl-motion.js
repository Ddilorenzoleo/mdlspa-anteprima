/**
 * MDL SPA — movimento del sito. Nessuna libreria, nessun dato: solo comportamento.
 *
 * - Ingressi: gli elementi delle sezioni entrano con dissolvenza quando arrivano a schermo.
 * - Apertura: l'immagine si allarga lentamente; l'header e' trasparente sopra di lei.
 * - Profondita': le immagini grandi scorrono un po' piu' piano della pagina (parallasse).
 * - Galleria orizzontale (.mdl-rail): si trascina col mouse, scorre col dito.
 * - Pagina Galleria (.mdl-justified): file piene senza tagli, filtri, visore a schermo intero.
 *
 * Con "riduci movimento" attivo nel sistema non parte niente: il sito resta fermo e
 * completo. Senza JavaScript, idem: le classi che nascondono gli elementi le aggiunge
 * questo script, quindi senza script nulla resta nascosto.
 */
(() => {
	const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const root = document.documentElement;

	// --- header sopra l'apertura -------------------------------------------------
	const hero = document.querySelector(".mdl-hero");
	const header = document.querySelector(".mdl-header");
	if (hero && header) {
		root.classList.add("mdl-has-hero");
		const aggiorna = () => header.classList.toggle("is-solid", window.scrollY > hero.offsetHeight - header.offsetHeight - 40);
		aggiorna();
		window.addEventListener("scroll", aggiorna, { passive: true });
	}

	// --- galleria orizzontale trascinabile (anche con movimento ridotto) -------------
	document.querySelectorAll(".mdl-rail").forEach((rail) => {
		let giu = false, x0 = 0, s0 = 0, mosso = false;
		rail.addEventListener("pointerdown", (e) => {
			if (e.pointerType !== "mouse") return; // touch: scorrimento nativo
			giu = true; mosso = false; x0 = e.clientX; s0 = rail.scrollLeft;
			rail.classList.add("is-dragging");
		});
		window.addEventListener("pointermove", (e) => {
			if (!giu) return;
			const dx = e.clientX - x0;
			if (Math.abs(dx) > 4) mosso = true;
			rail.scrollLeft = s0 - dx;
		});
		window.addEventListener("pointerup", () => { giu = false; rail.classList.remove("is-dragging"); });
		// un trascinamento non deve aprire il link della card
		rail.addEventListener("click", (e) => { if (mosso) { e.preventDefault(); e.stopPropagation(); } }, true);
		rail.querySelectorAll("img").forEach((img) => img.setAttribute("draggable", "false"));
	});

	// --- galleria: file giustificate, filtri, visore (anche con movimento ridotto) ------
	document.querySelectorAll(".mdl-justified").forEach((griglia) => {
		const foto = [...griglia.querySelectorAll(".mdl-g")];
		// Proporzioni vere di ogni foto: la fila si riempie senza tagliare nessuna immagine.
		foto.forEach((fig) => {
			const img = fig.querySelector("img");
			const misura = () => { if (img.naturalWidth) fig.style.setProperty("--r", (img.naturalWidth / img.naturalHeight).toFixed(3)); };
			img.complete ? misura() : img.addEventListener("load", misura, { once: true });
			fig.tabIndex = 0;
			fig.setAttribute("role", "button");
			fig.setAttribute("aria-label", `Apri a schermo intero: ${img.alt}`);
		});

		// Filtri: con le View Transitions le foto scivolano al loro nuovo posto.
		const sezione = griglia.parentElement;
		sezione.querySelectorAll(".mdl-filtri button").forEach((btn, _, tutti) => {
			btn.addEventListener("click", () => {
				const f = btn.dataset.filtro;
				const applica = () => {
					tutti.forEach((b) => { const on = b === btn; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", String(on)); });
					foto.forEach((fig) => { fig.hidden = f !== "tutte" && !fig.classList.contains(`mdl-g-${f}`); });
				};
				if (document.startViewTransition && !ridotto) {
					foto.forEach((fig, i) => { fig.style.viewTransitionName = `mdl-g-${i}`; });
					document.startViewTransition(applica);
				} else applica();
			});
		});

		// Visore a schermo intero: frecce, Esc, scorrimento col dito, clic sul fondo per chiudere.
		let lb = null, attuale = 0, daChi = null;
		const visibili = () => foto.filter((fig) => !fig.hidden);
		const mostra = (i) => {
			const lista = visibili();
			attuale = (i + lista.length) % lista.length;
			const img = lista[attuale].querySelector("img");
			const vista = lb.querySelector(".mdl-lb-stage img");
			vista.classList.add("is-entering");
			vista.onload = () => requestAnimationFrame(() => vista.classList.remove("is-entering"));
			vista.src = img.currentSrc || img.src;
			vista.alt = img.alt;
			lb.querySelector(".mdl-lb-cap").textContent = lista[attuale].querySelector("figcaption")?.textContent ?? "";
			lb.querySelector(".mdl-lb-count").textContent = `${attuale + 1} / ${lista.length}`;
		};
		const chiudi = () => {
			lb.classList.remove("is-open");
			root.classList.remove("mdl-lb-aperto");
			document.removeEventListener("keydown", tasti);
			setTimeout(() => { lb.remove(); lb = null; }, ridotto ? 0 : 350);
			daChi?.focus();
		};
		const tasti = (e) => {
			if (e.key === "Escape") chiudi();
			else if (e.key === "ArrowRight") mostra(attuale + 1);
			else if (e.key === "ArrowLeft") mostra(attuale - 1);
		};
		const apri = (fig) => {
			daChi = fig;
			lb = document.createElement("div");
			lb.className = "mdl-lb";
			lb.setAttribute("role", "dialog");
			lb.setAttribute("aria-modal", "true");
			lb.setAttribute("aria-label", "Galleria a schermo intero");
			lb.innerHTML =
				'<div class="mdl-lb-stage"><img alt=""></div>' +
				'<div class="mdl-lb-bar"><span class="mdl-lb-cap"></span><span class="mdl-lb-count"></span></div>' +
				'<button type="button" class="mdl-lb-close" aria-label="Chiudi">✕</button>' +
				'<button type="button" class="mdl-lb-prev" aria-label="Foto precedente">←</button>' +
				'<button type="button" class="mdl-lb-next" aria-label="Foto successiva">→</button>';
			document.body.appendChild(lb);
			lb.querySelector(".mdl-lb-close").addEventListener("click", chiudi);
			lb.querySelector(".mdl-lb-prev").addEventListener("click", () => mostra(attuale - 1));
			lb.querySelector(".mdl-lb-next").addEventListener("click", () => mostra(attuale + 1));
			lb.querySelector(".mdl-lb-stage").addEventListener("click", (e) => { if (e.target === e.currentTarget) chiudi(); });
			let x0 = null;
			lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
			lb.addEventListener("touchend", (e) => {
				if (x0 === null) return;
				const dx = e.changedTouches[0].clientX - x0;
				if (Math.abs(dx) > 50) mostra(attuale + (dx < 0 ? 1 : -1));
				x0 = null;
			});
			document.addEventListener("keydown", tasti);
			root.classList.add("mdl-lb-aperto");
			mostra(visibili().indexOf(fig));
			requestAnimationFrame(() => lb.classList.add("is-open"));
			lb.querySelector(".mdl-lb-close").focus();
		};
		foto.forEach((fig) => {
			fig.addEventListener("click", () => apri(fig));
			fig.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(fig); } });
		});
	});

	if (ridotto) return;
	root.classList.add("mdl-motion");

	// --- ingressi --------------------------------------------------------------------
	const sezioni = document.querySelectorAll(".wp-block-post-content > *");
	const bersagli = [];
	sezioni.forEach((sezione) => {
		const figli = sezione.querySelectorAll("h1, h2, h3, p, .wp-block-buttons, .wp-block-image, .mdl-rail-card, .mdl-value, .mdl-device, .wp-block-table");
		const lista = figli.length ? figli : [sezione];
		lista.forEach((el, i) => {
			if (el.closest(".mdl-hero, .mdl-hero-split")) return; // l'apertura ha il suo ingresso
			el.classList.add("mdl-in");
			el.style.setProperty("--mdl-delay", `${Math.min(i % 6, 5) * 70}ms`);
			bersagli.push(el);
		});
	});
	// Si accende tutto cio' che ha raggiunto il 92% dello schermo O che e' gia' passato
	// sopra. Non basta "vederlo passare": con uno scorrimento veloce (o un link interno)
	// un blocco salta da sotto a sopra lo schermo senza mai intersecarlo, e resterebbe
	// invisibile per sempre. Successo il 23/10/2026 sulla striscia di THERMAL-04.
	let inAttesa = bersagli;
	const accendi = () => {
		const soglia = window.innerHeight * 0.92;
		inAttesa = inAttesa.filter((el) => {
			if (el.getBoundingClientRect().top < soglia) { el.classList.add("is-in"); return false; }
			return true;
		});
	};
	let inCoda = false;
	window.addEventListener("scroll", () => { if (!inCoda) { inCoda = true; requestAnimationFrame(() => { inCoda = false; accendi(); }); } }, { passive: true });
	window.addEventListener("resize", accendi);
	accendi();

	// --- parallasse sulle immagini grandi ----------------------------------------------
	// Su mobile niente profondita': l'immagine e' piccola e il taglio in piu' si vede.
	if (window.matchMedia("(max-width: 781px)").matches) return;
	const lenti = [...document.querySelectorAll(".wp-block-cover__image-background, .mdl-feature-img img, .mdl-value-img img")];
	let pianificato = false;
	const muovi = () => {
		pianificato = false;
		const h = window.innerHeight;
		for (const img of lenti) {
			const r = img.parentElement.getBoundingClientRect();
			if (r.bottom < 0 || r.top > h) continue;
			const p = (r.top + r.height / 2 - h / 2) / h; // -1..1 circa
			// Ingrandimento minimo indispensabile al movimento: ogni punto in piu' e' foto persa.
			img.style.transform = `translate3d(0, ${(p * -2.5).toFixed(2)}%, 0) scale(1.06)`;
		}
	};
	window.addEventListener("scroll", () => { if (!pianificato) { pianificato = true; requestAnimationFrame(muovi); } }, { passive: true });
	muovi();
})();
