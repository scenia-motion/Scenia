const GITHUB_REPO = "https://github.com/dotloadmovie/scenia";

function getBase() {
  const meta = document.querySelector('meta[name="scenia-base"]');
  let base = meta?.content ?? "/";
  if (!base.endsWith("/")) {
    base += "/";
  }
  return base;
}

function playerSrc(base, slug) {
  return `${base}builds/${slug}/player.html`;
}

function demoFromQuery() {
  return new URLSearchParams(location.search).get("demo");
}

function setDemo(slug, demos, { replace = false } = {}) {
  const base = getBase();
  const select = document.getElementById("demo-select");
  const iframe = document.getElementById("player");

  if (!demos.some((d) => d.slug === slug)) {
    slug = demos[0]?.slug;
  }
  if (!slug) {
    return;
  }

  select.value = slug;
  iframe.src = playerSrc(base, slug);

  const url = new URL(location.href);
  url.searchParams.set("demo", slug);
  if (replace) {
    history.replaceState({ demo: slug }, "", url);
  } else {
    history.pushState({ demo: slug }, "", url);
  }
}

async function init() {
  const res = await fetch("demos.json");
  if (!res.ok) {
    throw new Error("Failed to load demos.json");
  }
  const demos = await res.json();

  const select = document.getElementById("demo-select");
  select.replaceChildren(
    ...demos.map((d) => {
      const opt = document.createElement("option");
      opt.value = d.slug;
      opt.textContent = d.label;
      return opt;
    })
  );

  const github = document.getElementById("github-link");
  github.href = GITHUB_REPO;

  let slug = demoFromQuery() ?? demos[0]?.slug;
  setDemo(slug, demos, { replace: true });

  select.addEventListener("change", () => {
    setDemo(select.value, demos);
  });

  window.addEventListener("popstate", () => {
    const slug = demoFromQuery() ?? demos[0]?.slug;
    setDemo(slug, demos, { replace: true });
  });
}

init().catch((err) => {
  console.error(err);
  document.getElementById("player").replaceWith(
    Object.assign(document.createElement("p"), {
      textContent: "Failed to load demo gallery.",
      style: "padding: 20px;"
    })
  );
});
