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
  fetch("https://api.github.com/users/arnavpawar671-ctrl", {
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

  const liveRepoGrid = $("#live-repo-grid");
  const liveRepoNote = $("#repositories-note");
  if (liveRepoGrid) {
    fetch("https://api.github.com/users/arnavpawar671-ctrl/repos?sort=updated&per_page=4")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((repos) => {
        repos.filter((repo) => !repo.fork).slice(0, 4).forEach((repo) => {
          const card = document.createElement("article");
          card.className = "live-repo-card";
          const title = document.createElement("h4");
          const link = document.createElement("a");
          link.href = repo.html_url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = repo.name;
          title.append(link);
          const description = document.createElement("p");
          description.className = "live-repo-description";
          description.textContent = repo.description || "Open the repository to explore this project.";
          const meta = document.createElement("p");
          meta.className = "live-repo-meta";
          meta.textContent = (repo.language || "Code") + " · ★ " + (repo.stargazers_count || 0);
          card.append(title, description, meta);
          liveRepoGrid.append(card);
        });
        if (liveRepoNote) liveRepoNote.textContent = "Latest public repositories from GitHub.";
      })
      .catch(() => { if (liveRepoNote) liveRepoNote.textContent = "Live repositories are temporarily unavailable. Use the All repositories link above."; });
  }

});