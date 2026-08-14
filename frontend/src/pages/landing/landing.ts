const stats = [
  { name: "months", end: 15 },
  { name: "users", end: 62 },
  { name: "classes", end: 5 },
  { name: "content", end: 981 },
]

function timingFunction(t: number, maxVal: number) {
  return Math.min((t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)) * maxVal, maxVal)
}

function updateStats() {
  let elapsed = performance.now() - statsStart
  let t = elapsed / statsDuration

  for (const s of stats) {
    let value = timingFunction(t, s.end)
    document.getElementById("stat-" + s.name)!.textContent = Math.round(value).toString() + "+"
  }
  if (elapsed <= statsDuration) requestAnimationFrame(updateStats)
}

function setupQuotes() {
  const container = document.getElementById("quotes")!
  const num = container.children.length
  const first = container.children[0]
  const second = container.children[1]
  const prevlast = container.children[num - 2]
  const last = container.children[num - 1]
  const quoteWidth = first.getBoundingClientRect().width
  container.append(first.cloneNode(true))
  container.append(second.cloneNode(true))
  container.prepend(last.cloneNode(true))
  container.prepend(prevlast.cloneNode(true))

  container.scrollLeft = quoteWidth
  container.addEventListener("scroll", () => {
    if (Math.abs(container.scrollLeft) < 1) {
      container.scrollLeft = num * quoteWidth
    }
    else if (Math.abs(container.scrollLeft - (num + 1) * (quoteWidth + 16)) < 1) {
      container.scrollLeft = quoteWidth
    }
  })

  document.getElementById("quotes-caroussel-left")?.addEventListener("click", () => {
    container.scrollBy({
      left: - quoteWidth - 16,
      behavior: "smooth"
    });
  })

  document.getElementById("quotes-caroussel-right")?.addEventListener("click", () => {
    container.scrollBy({
      left: quoteWidth + 16,
      behavior: "smooth"
    });
  })
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

let statsStart = 0;
const statsDuration = 2000;

window.onload = async () => {
  setupQuotes()
  const statsObserver = new IntersectionObserver((entries, observer) => {
    if (entries[0].isIntersecting) {
      statsStart = performance.now()
      updateStats()
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

  document.querySelectorAll(".details").forEach(el => el.addEventListener("click", () => {
    if (el.hasAttribute("open")) {
      [...el.children].forEach(c => (c as HTMLElement).style.height = "0px");
    }
    else {
      [...el.children].forEach(c => (c as HTMLElement).style.height = c.scrollHeight + 16 + "px");
    }
    el.toggleAttribute("open")
  }))

  const fullscreenContainer = document.getElementById("img-fullscreen-container") as HTMLImageElement
  document.addEventListener("click", ev => {
    let src = ""
    document.querySelectorAll(".img-fullscreenable").forEach(el => {
      const imgEl = el as HTMLImageElement
      if (ev.target === imgEl && fullscreenContainer.src !== imgEl.src) src = imgEl.src
    })
    fullscreenContainer.src = src
  })

  const deviceSize = window.matchMedia('(max-width: 800px)').matches ? "mobile" : "desktop";
  const colorTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? "dark" : "light";

  const imgById = (id: string): HTMLImageElement => document.getElementById(id) as HTMLImageElement
  imgById("head-image").src = `/assets/landing/main-desktop-${colorTheme}.png`

  await Promise.all(["main", "homework", "events", "uploads"].map(f => {
    const i = imgById(`feature-${f}-img`)
    i.src = `/assets/landing/${f}-${deviceSize}-${colorTheme}.png`
    return i.decode()
  }))

  document.body.style.display = "block"
}
