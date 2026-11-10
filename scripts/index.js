// Página de Consulta: interatividade.
// Cada parte abaixo cuida de uma funcionalidade. Os comentários explicam o
// que cada trecho faz, como uma prévia do JavaScript que vem nos próximos sprints.

const page = document.querySelector(".page");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// O localStorage guarda informações no navegador, mesmo depois de fechar a
// página. Ele pode estar bloqueado (ex.: janela anônima), por isso o try/catch.
function readSetting(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function saveSetting(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    // Sem armazenamento: a página continua funcionando, só não lembra a escolha.
  }
}

function scrollBehavior() {
  return reduceMotion.matches ? "auto" : "smooth";
}

/* ---------- 1. Tema claro e escuro ---------- */

const THEME_KEY = "consulta-tema";
const themeButton = document.querySelector(".theme-toggle");

function updateThemeButton() {
  const isDark = page.classList.contains("page_theme_dark");
  themeButton.setAttribute("aria-pressed", String(isDark));
  themeButton.setAttribute(
    "aria-label",
    isDark ? "Mudar para o tema claro" : "Mudar para o tema escuro",
  );
}

themeButton.addEventListener("click", () => {
  const isDark = page.classList.toggle("page_theme_dark");
  saveSetting(THEME_KEY, isDark ? "escuro" : "claro");
  updateThemeButton();
});

updateThemeButton();

/* ---------- 2. Menu lateral no celular e no tablet ---------- */

const menuButton = document.querySelector(".header__menu-button");
const sidebar = document.querySelector(".layout__sidebar");
const overlay = document.querySelector(".layout__overlay");
const closeButton = document.querySelector(".nav__close");
const mobileQuery = window.matchMedia("(max-width: 1024px)");

function isMenuOpen() {
  return sidebar.classList.contains("layout__sidebar_open");
}

// Quando o menu está escondido fora da tela, "inert" impede que a tecla Tab
// entre nos links dele.
function syncSidebarAccess() {
  sidebar.inert = mobileQuery.matches && !isMenuOpen();
}

function openMenu() {
  sidebar.classList.add("layout__sidebar_open");
  overlay.classList.add("layout__overlay_visible");
  menuButton.setAttribute("aria-expanded", "true");
  syncSidebarAccess();
  closeButton.focus();
}

function closeMenu() {
  if (!isMenuOpen()) {
    return;
  }
  sidebar.classList.remove("layout__sidebar_open");
  overlay.classList.remove("layout__overlay_visible");
  menuButton.setAttribute("aria-expanded", "false");
  syncSidebarAccess();
}

menuButton.addEventListener("click", openMenu);
closeButton.addEventListener("click", () => {
  closeMenu();
  menuButton.focus();
});
overlay.addEventListener("click", closeMenu);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isMenuOpen()) {
    closeMenu();
    menuButton.focus();
  }
});

mobileQuery.addEventListener("change", () => {
  if (!mobileQuery.matches) {
    closeMenu();
  }
  syncSidebarAccess();
});

syncSidebarAccess();

/* ---------- 3. Destacar no menu a seção que está na tela ---------- */

const navLinks = document.querySelectorAll(".nav__link");
const sections = document.querySelectorAll(".hero, .topic");

function setActiveLink(id) {
  navLinks.forEach((link) => {
    const isActive = link.getAttribute("href") === `#${id}`;
    link.classList.toggle("nav__link_active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "true");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

// O IntersectionObserver avisa quando um elemento entra numa faixa da tela.
// Aqui a faixa é uma linha perto do topo: a seção que cruza essa linha é a atual.
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setActiveLink(entry.target.id);
      }
    });
  },
  { rootMargin: "-25% 0px -70% 0px" },
);

sections.forEach((section) => sectionObserver.observe(section));

/* ---------- 4. Botões "Copiar" dos blocos de código ---------- */

function showCopyResult(button, text) {
  button.textContent = text;
  button.classList.add("code__copy_done");
  clearTimeout(button.resetTimer);
  button.resetTimer = setTimeout(() => {
    button.textContent = "Copiar";
    button.classList.remove("code__copy_done");
  }, 2000);
}

document.querySelectorAll(".code").forEach((block) => {
  const button = block.querySelector(".code__copy");
  const content = block.querySelector(".code__content");

  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(content.textContent);
      showCopyResult(button, "Copiado!");
    } catch (error) {
      showCopyResult(button, "Erro ao copiar");
    }
  });
});

/* ---------- 5. Abas dos modelos ---------- */

// Guarda a função de trocar de aba de cada grupo, para a busca poder usar.
const tabControls = new Map();

document.querySelectorAll(".tabs").forEach((tabs) => {
  const buttons = Array.from(tabs.querySelectorAll(".tabs__button"));
  const panels = Array.from(tabs.querySelectorAll(".tabs__panel"));

  function selectTab(index, moveFocus) {
    buttons.forEach((button, buttonIndex) => {
      const isSelected = buttonIndex === index;
      button.classList.toggle("tabs__button_active", isSelected);
      button.setAttribute("aria-selected", String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
      panels[buttonIndex].hidden = !isSelected;
    });
    if (moveFocus) {
      buttons[index].focus();
    }
  }

  buttons.forEach((button, index) => {
    button.addEventListener("click", () => selectTab(index, false));

    // Setas, Home e End navegam entre as abas, como o leitor de tela espera.
    button.addEventListener("keydown", (event) => {
      const last = buttons.length - 1;
      const keys = {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      };
      if (event.key in keys) {
        event.preventDefault();
        selectTab(keys[event.key], true);
      }
    });
  });

  selectTab(0, false);
  tabControls.set(tabs, { panels, selectTab });
});

/* ---------- 6. Checklist com progresso salvo ---------- */

const CHECKLIST_KEY = "consulta-checklist";
const checkboxes = Array.from(document.querySelectorAll(".checklist__checkbox"));
const progressText = document.querySelector(".checklist__progress-text");
const progressBar = document.querySelector(".checklist__bar");
const progressFill = document.querySelector(".checklist__fill");
const resetButton = document.querySelector(".checklist__reset");

function loadChecked() {
  try {
    return JSON.parse(readSetting(CHECKLIST_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function updateProgress() {
  const checked = checkboxes.filter((checkbox) => checkbox.checked);
  const percent = Math.round((checked.length / checkboxes.length) * 100);

  progressText.textContent = `${checked.length} de ${checkboxes.length} itens (${percent}%)`;
  progressFill.style.width = `${percent}%`;
  progressBar.setAttribute("aria-valuenow", String(percent));
  saveSetting(CHECKLIST_KEY, JSON.stringify(checked.map((checkbox) => checkbox.id)));
}

const savedChecks = loadChecked();
checkboxes.forEach((checkbox) => {
  checkbox.checked = savedChecks.includes(checkbox.id);
  checkbox.addEventListener("change", updateProgress);
});

resetButton.addEventListener("click", () => {
  if (window.confirm("Desmarcar todos os itens para começar um projeto novo?")) {
    checkboxes.forEach((checkbox) => {
      checkbox.checked = false;
    });
    updateProgress();
  }
});

updateProgress();

/* ---------- 7. Busca no guia ---------- */

const searchForm = document.querySelector(".search");
const searchInput = document.querySelector(".search__input");
const searchResults = document.querySelector(".search-results");
const searchResultsText = document.querySelector(".search-results__text");
const clearSearchButton = document.querySelector(".search-results__clear");
const hero = document.querySelector(".hero");
const openedBySearch = new Set();

// Deixa o texto em minúsculas e sem acentos, para "semantica" achar "semântica".
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Prepara uma lista com o texto de cada seção e de cada parte dela.
const searchIndex = Array.from(document.querySelectorAll(".topic")).map((topic) => ({
  topic,
  headerText: normalizeText(topic.querySelector(".topic__header").textContent),
  navLink: document.querySelector(`.nav__link[href="#${topic.id}"]`),
  parts: Array.from(topic.querySelectorAll("[data-part]")).map((part) => ({
    part,
    text: normalizeText(part.textContent),
  })),
}));

// Abre o que estiver escondido dentro de uma parte encontrada:
// a resposta de um erro comum ou a aba certa dos modelos.
function revealMatch(part, query) {
  if (part.tagName === "DETAILS" && !part.open) {
    part.open = true;
    openedBySearch.add(part);
  }
  part.querySelectorAll(".tabs").forEach((tabs) => {
    const { panels, selectTab } = tabControls.get(tabs);
    const index = panels.findIndex((panel) => normalizeText(panel.textContent).includes(query));
    if (index >= 0) {
      selectTab(index, false);
    }
  });
}

function closeOpenedBySearch() {
  openedBySearch.forEach((details) => {
    details.open = false;
  });
  openedBySearch.clear();
}

function showEverything() {
  hero.hidden = false;
  searchResults.hidden = true;
  searchIndex.forEach(({ topic, navLink, parts }) => {
    topic.hidden = false;
    navLink.classList.remove("nav__link_dimmed");
    parts.forEach(({ part }) => {
      part.hidden = false;
    });
  });
}

function runSearch() {
  const rawQuery = searchInput.value.trim();
  const query = normalizeText(rawQuery);
  const wasSearching = !searchResults.hidden;

  closeOpenedBySearch();

  if (query.length < 2) {
    showEverything();
    return;
  }

  let sectionsFound = 0;

  searchIndex.forEach(({ topic, headerText, navLink, parts }) => {
    const headerMatches = headerText.includes(query);
    let partsFound = 0;

    parts.forEach(({ part, text }) => {
      const partMatches = text.includes(query);
      part.hidden = !(headerMatches || partMatches);
      if (partMatches) {
        partsFound += 1;
        revealMatch(part, query);
      }
    });

    const showTopic = headerMatches || partsFound > 0;
    topic.hidden = !showTopic;
    navLink.classList.toggle("nav__link_dimmed", !showTopic);
    if (showTopic) {
      sectionsFound += 1;
    }
  });

  hero.hidden = true;
  searchResults.hidden = false;

  if (sectionsFound === 0) {
    searchResultsText.textContent = `Nada encontrado para "${rawQuery}". Tente outra palavra, como "margin" ou "BEM".`;
  } else {
    const label = sectionsFound === 1 ? "seção" : "seções";
    searchResultsText.textContent = `"${rawQuery}" aparece em ${sectionsFound} ${label}.`;
  }

  // Ao começar uma busca, volta ao topo para os resultados aparecerem.
  if (!wasSearching) {
    window.scrollTo({ top: 0, behavior: "auto" });
  }
}

function clearSearch() {
  searchInput.value = "";
  runSearch();
}

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 150);
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimeout(searchTimer);
  runSearch();
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    clearSearch();
  }
});

clearSearchButton.addEventListener("click", () => {
  clearSearch();
  searchInput.focus();
});

// Atalho: a tecla "/" vai direto para a busca (se você não estiver digitando).
document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTyping = target.matches("input, textarea") || target.isContentEditable;
  if (event.key === "/" && !isTyping) {
    event.preventDefault();
    searchInput.focus();
  }
});

/* ---------- 8. Rolagem suave nos links internos ---------- */

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) {
      return;
    }
    event.preventDefault();
    closeMenu();

    // Se a busca escondeu a seção, limpa a busca antes de ir até ela.
    if (target.hidden || target.closest("[hidden]")) {
      clearSearch();
    }

    target.scrollIntoView({ behavior: scrollBehavior() });
    history.pushState(null, "", link.getAttribute("href"));
  });
});

/* ---------- 9. Botão de voltar ao topo ---------- */

const toTopButton = document.querySelector(".to-top");

function updateToTopButton() {
  toTopButton.classList.toggle("to-top_visible", window.scrollY > 600);
}

toTopButton.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: scrollBehavior() });
});

window.addEventListener("scroll", updateToTopButton, { passive: true });
updateToTopButton();
