function timingFunction(t: number, maxVal: number): number {
  return Math.min((t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) * maxVal, maxVal);
}

const statsDuration = 2000;

async function initStats(statsStart: number): Promise<void> {
  // The landing page stays up while the application is down, so /stats can fail.
  // Without live numbers the whole section is meaningless, so hide it.
  let res;
  try {
    const response = await fetch("/stats");
    if (!response.ok) throw new Error(`/stats responded with ${response.status}`);
    res = await response.json();
  }
  catch {
    document.getElementById("stats-section")!.hidden = true;
    return;
  }

  const firstDay = new Date(2025, 4, 1); // May 1, 2025

  const stats = [
    { name: "months", end: (new Date().getFullYear() - firstDay.getFullYear()) * 12 + (new Date().getMonth() - firstDay.getMonth()) },
    { name: "users", end: res.registeredUsers },
    { name: "classes", end: res.registeredClasses },
    { name: "content", end: res.createdHomeworkAndEvents }
  ];

  updateStats(stats, statsStart);
}

function updateStats(stats: {name: string, end: number}[], statsStart: number): void {
  const elapsed = performance.now() - statsStart;
  const t = elapsed / statsDuration;

  for (const s of stats) {
    const value = timingFunction(t, s.end);
    document.getElementById("stat-" + s.name)!.textContent = Math.round(value).toString() + "+";
  }
  if (elapsed <= statsDuration) requestAnimationFrame(() => updateStats(stats, statsStart));
}

function setupQuotes(): void {
  const container = document.getElementById("quotes")!;
  const num = container.children.length;
  const first = container.children[0];
  const second = container.children[1];
  const prevlast = container.children[num - 2];
  const last = container.children[num - 1];
  const quoteWidth = first.getBoundingClientRect().width;
  const cloneQuote = (quote: Element): HTMLElement => {
    const clone = quote.cloneNode(true) as HTMLElement;
    clone.setAttribute("aria-hidden", "true");
    clone.setAttribute("inert", "");
    return clone;
  };
  container.append(cloneQuote(first));
  container.append(cloneQuote(second));
  container.prepend(cloneQuote(last));
  container.prepend(cloneQuote(prevlast));

  container.scrollLeft = quoteWidth + 16;
  container.addEventListener("scroll", () => {
    if (Math.abs(container.scrollLeft) < 1) {
      container.scrollLeft = num * (quoteWidth + 16);
    }
    else if (Math.abs(container.scrollLeft - (num + 1) * (quoteWidth + 16)) < 1) {
      container.scrollLeft = quoteWidth + 16;
    }
  });

  document.getElementById("quotes-caroussel-left")?.addEventListener("click", () => {
    container.scrollBy({
      left: - quoteWidth - 16,
      behavior: "smooth"
    });
  });

  document.getElementById("quotes-caroussel-right")?.addEventListener("click", () => {
    container.scrollBy({
      left: quoteWidth + 16,
      behavior: "smooth"
    });
  });

  const carousel = document.getElementById("quotes-caroussel")!;
  if (
    window.matchMedia("(hover: hover)").matches
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    setInterval(() => {
      if (
        !document.hidden
        && !carousel.matches(":hover")
        && !carousel.matches(":focus-within")
      ) container.scrollLeft += 1;
    }, 10);
  }
}

function toggleScrollFade(el: HTMLElement): void {
  const toBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
  el.style.setProperty("--fade-progress", Math.min(32, toBottom) + "px");
}

function initScrollFade(el: HTMLElement): void {
  toggleScrollFade(el);

  new ResizeObserver(() => toggleScrollFade(el)).observe(el);

  el.addEventListener("scroll", () => {
    toggleScrollFade(el);
  });
}

function setupFullscreenImages(): void {
  const dialog = document.getElementById("img-fullscreen-dialog") as HTMLDialogElement;
  const fullscreenImage = document.getElementById("img-fullscreen-container") as HTMLImageElement;
  const closeButton = document.getElementById("img-fullscreen-close") as HTMLButtonElement;
  let activeTrigger: HTMLButtonElement | null = null;

  document.querySelectorAll<HTMLButtonElement>(".img-fullscreenable").forEach(trigger => {
    trigger.addEventListener("click", () => {
      const image = trigger.querySelector("img");
      if (!image) return;

      activeTrigger = trigger;
      fullscreenImage.src = image.currentSrc || image.src;
      fullscreenImage.alt = image.alt;
      dialog.showModal();
    });
  });

  closeButton.addEventListener("click", () => dialog.close());
  fullscreenImage.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => {
    activeTrigger?.focus();
    activeTrigger = null;
  });
}

window.addEventListener("load", () => {
  const statsObserver = new IntersectionObserver((entries, observer) => {
    if (entries[0].isIntersecting) {
      initStats(performance.now());
      observer.unobserve(entries[0].target);
    }
  }, {threshold: 0.25});

  statsObserver.observe(document.querySelector("#stats")!);

  document.querySelectorAll(".scroll-fade").forEach(e => initScrollFade(e as HTMLElement));

  const scrollFadeObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (!(node instanceof HTMLElement)) return;

        if (node.matches(".scroll-fade")) {
          initScrollFade(node);
        }

        node.querySelectorAll?.(".scroll-fade").forEach(el => initScrollFade(el as HTMLElement));
      });
    });
  });

  scrollFadeObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  setupFullscreenImages();
  setupQuotes();
});
