/* Arnav portfolio interactions — lightweight, accessible, dependency-free. */
document.addEventListener("DOMContentLoaded", () => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Footer year.
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Mobile navigation: keyboard-friendly, closes after selection or Escape.
  const menuToggle = $("#menu-toggle");
  const navLinks = $("#nav-links");
  const closeMenu = () => {
    if (!menuToggle || !navLinks) return;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    navLinks.classList.remove("open");
  };
  menuToggle?.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    menuToggle.setAttribute("aria-label", expanded ? "Open navigation" : "Close navigation");
    navLinks?.classList.toggle("open", !expanded);
  });
  $$("#nav-links a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  document.addEventListener("click", (event) => {
    if (navLinks?.classList.contains("open") &&
        !navLinks.contains(event.target) && !menuToggle?.contains(event.target)) closeMenu();
  });

  // Scroll progress and back-to-top button.
  const progressBar = $("#scroll-progress-bar");
  const backToTop = $("#back-to-top");
  let ticking = false;
  const updateScrollUI = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    if (progressBar) progressBar.style.width = progress + "%";
    backToTop?.classList.toggle("visible", window.scrollY > 550);
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(updateScrollUI);
      ticking = true;
    }
  }, { passive: true });
  updateScrollUI();

  // Subtle reveal animation with reduced-motion support.
  const revealElements = $$(".section-heading, .about-grid, .principles > div, .skill-card, .project-card, .github-panel, .activity-cta, .timeline-item, .contact-shell");
  if (!reducedMotion && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -25px 0px" });
    revealElements.forEach((element) => {
      element.classList.add("reveal-ready");
      revealObserver.observe(element);
    });
  }

  // Active section indicator.
  const sections = $$("main section[id]");
  const links = $$("#nav-links a");
  if ("IntersectionObserver" in window) {
    const navObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
          const active = link.getAttribute("href") === "#" + entry.target.id;
          link.classList.toggle("active", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-25% 0px -60% 0px", threshold: 0 });
    sections.forEach((section) => navObserver.observe(section));
  }

  // Filter project cards without removing them from the document.
  const filterButtons = $$(".filter-btn");
  const projectCards = $$(".project-card[data-category]");
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter || "all";
      filterButtons.forEach((candidate) => {
        const active = candidate === button;
        candidate.classList.toggle("active", active);
        candidate.setAttribute("aria-pressed", String(active));
      });
      projectCards.forEach((card) => {
        const categories = (card.dataset.category || "").split(/\s+/);
        const show = filter === "all" || categories.includes(filter);
        card.hidden = !show;
      });
    });
  });

  // Fetch live public GitHub profile data. The portfolio still works if the API is unavailable.
  const githubNote = $("#github-note");
  const numberFormat = new Intl.NumberFormat();
  const setText = (selector, value) => {
    const element = $(selector);
    if (element) element.textContent = value;
  };
  fetch("https://api.github.com/users/11kzpk-1906", {
    headers: { Accept: "application/vnd.github+json" }
  })
    .then((response) => {
      if (!response.ok) throw new Error("GitHub profile request failed");
      return response.json();
    })
    .then((profile) => {
      setText("#repo-count", numberFormat.format(profile.public_repos ?? 0));
      setText("#follower-count", numberFormat.format(profile.followers ?? 0));
      setText("#following-count", numberFormat.format(profile.following ?? 0));
      const created = profile.created_at ? new Date(profile.created_at).getFullYear() : null;
      setText("#profile-created", created ? String(created) : "On GitHub");
      if (githubNote) githubNote.textContent = "Live public profile data · Updated whenever you visit.";
      const avatar = $(".github-profile img");
      if (avatar && profile.avatar_url) avatar.src = profile.avatar_url;
    })
    .catch(() => {
      setText("#repo-count", "↗");
      setText("#follower-count", "↗");
      setText("#following-count", "↗");
      setText("#profile-created", "GitHub");
      if (githubNote) githubNote.textContent = "Live stats couldn't load right now. Your GitHub profile is still one click away.";
    });

  // Live public repository dashboard: graceful loading, empty, and error states.
  const liveReposGrid = $("#live-repos-grid");
  const liveReposNote = $("#live-repos-note");
  const formatRepoDate = (dateString) => {
    if (!dateString) return "Date unknown";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "Date unknown";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(date);
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
  if (liveReposGrid) {
    fetch("https://api.github.com/users/11kzpk-1906/repos?sort=updated&direction=desc&per_page=100&type=owner", {
      headers: { Accept: "application/vnd.github+json" }
    })
      .then((response) => {
        if (!response.ok) throw new Error("GitHub repositories request failed");
        return response.json();
      })
      .then((repositories) => {
        if (!Array.isArray(repositories)) throw new Error("Unexpected GitHub response");
        const recent = repositories
          .filter((repo) => !repo.fork && !repo.archived)
          .sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at))
          .slice(0, 6);
        liveReposGrid.setAttribute("aria-busy", "false");
        if (!recent.length) {
          liveReposGrid.innerHTML = '<div class="repo-empty">No public repositories found yet. Check back soon.</div>';
          if (liveReposNote) liveReposNote.textContent = "No public repositories were returned by GitHub.";
          return;
        }
        liveReposGrid.innerHTML = recent.map((repo) => {
          const language = repo.language ? escapeHtml(repo.language) : "Mixed / not specified";
          const description = repo.description ? escapeHtml(repo.description) : "An experiment in progress — open the repository to explore the code.";
          const updated = formatRepoDate(repo.pushed_at || repo.updated_at);
          return '<article class="live-repo-card">' +
            '<div class="live-repo-top"><a class="live-repo-name" href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(repo.name) + ' ↗</a><span class="live-repo-visibility">PUBLIC</span></div>' +
            '<p class="live-repo-description">' + description + '</p>' +
            '<div class="live-repo-meta"><span class="live-repo-language"><i class="repo-language-dot" aria-hidden="true"></i>' + language + '</span><span>☆ ' + numberFormat.format(repo.stargazers_count || 0) + '</span><span>⑂ ' + numberFormat.format(repo.forks_count || 0) + '</span><span class="live-repo-updated">Pushed ' + escapeHtml(updated) + '</span></div>' +
            '</article>';
        }).join("");
        if (liveReposNote) liveReposNote.textContent = "Showing " + recent.length + " recently active public repositories · refreshed on each visit.";
      })
      .catch(() => {
        liveReposGrid.setAttribute("aria-busy", "false");
        liveReposGrid.innerHTML = '<div class="repo-empty">Couldn’t load repository data right now. The GitHub API may be temporarily unavailable.</div>';
        if (liveReposNote) liveReposNote.innerHTML = 'You can still browse <a href="https://github.com/11kzpk-1906?tab=repositories" target="_blank" rel="noopener noreferrer">all repositories on GitHub ↗</a>.';
      });
  }

  // Command palette: Ctrl/Cmd+K, searchable navigation, and arrow-key selection.
  const palette = $("#command-palette");
  const paletteTrigger = $("#palette-trigger");
  const paletteSearch = $("#palette-search");
  const paletteItems = $(".palette-item", palette || document);
  const paletteEmpty = $("#palette-empty");
  let activePaletteIndex = 0;
  const visiblePaletteItems = () => paletteItems.filter((item) => !item.hidden);
  const setActivePaletteItem = (index) => {
    const visible = visiblePaletteItems();
    if (!visible.length) return;
    activePaletteIndex = (index + visible.length) % visible.length;
    visible.forEach((item, i) => {
      item.classList.toggle("is-active", i === activePaletteIndex);
      item.setAttribute("aria-selected", String(i === activePaletteIndex));
    });
    visible[activePaletteIndex].scrollIntoView({ block: "nearest" });
  };
  const openPalette = () => {
    if (!palette || palette.open) return;
    if (typeof palette.showModal === "function") palette.showModal();
    else palette.setAttribute("open", "");
    document.body.classList.add("palette-open");
    if (paletteSearch) { paletteSearch.value = ""; paletteSearch.dispatchEvent(new Event("input")); paletteSearch.focus(); }
    setActivePaletteItem(0);
  };
  const closePalette = () => {
    if (!palette) return;
    if (typeof palette.close === "function" && palette.open) palette.close();
    else palette.removeAttribute("open");
    document.body.classList.remove("palette-open");
    paletteTrigger?.focus({ preventScroll: true });
  };
  paletteTrigger?.addEventListener("click", openPalette);
  palette?.addEventListener("click", (event) => { if (event.target === palette) closePalette(); });
  palette?.addEventListener("close", () => document.body.classList.remove("palette-open"));
  paletteSearch?.addEventListener("input", () => {
    const query = paletteSearch.value.trim().toLowerCase();
    paletteItems.forEach((item) => {
      const haystack = ((item.dataset.label || "") + " " + item.textContent).toLowerCase();
      item.hidden = !haystack.includes(query);
    });
    if (paletteEmpty) paletteEmpty.hidden = visiblePaletteItems().length > 0;
    activePaletteIndex = 0;
    setActivePaletteItem(0);
  });
  palette?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActivePaletteItem(activePaletteIndex + (event.key === "ArrowDown" ? 1 : -1));
    }
    if (event.key === "Enter" && document.activeElement === paletteSearch) {
      event.preventDefault();
      visiblePaletteItems()[activePaletteIndex]?.click();
    }
  });
  paletteItems.forEach((item) => {
    item.addEventListener("mouseenter", () => {
      const visible = visiblePaletteItems();
      const index = visible.indexOf(item);
      if (index >= 0) setActivePaletteItem(index);
    });
    item.addEventListener("click", (event) => {
      const target = item.dataset.target;
      if (!target) return;
      event.preventDefault();
      closePalette();
      document.querySelector(target)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
      if (target === "#projects") $('.filter-btn[data-filter="all"]')?.click();
    });
  });
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (palette?.open) closePalette(); else openPalette();
    }
    if (event.key === "Escape" && palette?.open) closePalette();
  });

  // Keep decorative interactions gentle and disable them for reduced-motion preferences.
  if (!reducedMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    $$(".project-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--pointer-x", ((event.clientX - rect.left) / rect.width * 100) + "%");
        card.style.setProperty("--pointer-y", ((event.clientY - rect.top) / rect.height * 100) + "%");
      });
    });
  }
});