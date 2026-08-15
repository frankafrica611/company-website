const SUPPORTED_LANGS = ["en", "fr", "pt", "ar", "sw"];
const DEFAULT_LANG = "en";
const WHATSAPP_URL = "https://wa.me/8619068999319";
const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";

const translations = {};
let currentLang = DEFAULT_LANG;

function getNested(obj, path) {
  return path.split(".").reduce((acc, key) => {
    if (acc && Object.prototype.hasOwnProperty.call(acc, key)) return acc[key];
    return null;
  }, obj);
}

// 由本脚本自身的 src 推导站点根相对前缀，使 i18n 在任意目录深度的页面（根/一级/二级）都能正确定位 lang/
function siteRootPrefix() {
  const script = document.querySelector('script[src$="i18n.js"]');
  if (!script) return "";
  const src = script.getAttribute("src") || "";
  const idx = src.indexOf("i18n.js");
  if (idx < 0) return "";
  return src.slice(0, idx).replace(/js\/?$/, "");
}

// 动态加载内联语言包（file:// 兜底用；script src 可加载本地文件，路径按页面深度修正）
function ensureBundle() {
  if (window.I18N_BUNDLE) return Promise.resolve();
  if (window.__i18nBundleLoading) return window.__i18nBundleLoading;
  window.__i18nBundleLoading = new Promise((resolve) => {
    const sc = document.createElement("script");
    sc.src = siteRootPrefix() + "lang/bundle.js";
    sc.onload = sc.onerror = () => resolve();
    document.head.appendChild(sc);
  });
  return window.__i18nBundleLoading;
}

async function loadLanguage(lang) {
  if (translations[lang]) return translations[lang];
  const prefix = siteRootPrefix();
  // 1) 服务器：fetch 加载 JSON（路径已按页面深度修正，子页面也能命中）
  try {
    const response = await fetch(prefix + `lang/${lang}.json`, { cache: "no-store" });
    if (response.ok) {
      const data = await response.json();
      translations[lang] = data;
      return data;
    }
  } catch (error) {
    // 本地用 file:// 直接打开时，浏览器会拦截 fetch 本地文件，这里静默走下方内联兜底
  }
  // 2) 兜底：动态注入内联语言包（lang/bundle.js，file:// 下可用）
  await ensureBundle();
  if (window.I18N_BUNDLE && window.I18N_BUNDLE[lang]) {
    translations[lang] = window.I18N_BUNDLE[lang];
    return translations[lang];
  }
  console.warn(`Language file missing: ${lang}`);
  return null;
}

function applyTranslations(data) {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = getNested(data, element.getAttribute("data-i18n"));
    if (value === null) return;
    if (element.hasAttribute("data-i18n-html")) {
      element.innerHTML = value;
    } else {
      element.textContent = value;
    }
  });

  document.querySelectorAll("[data-i18n-ph]").forEach((element) => {
    const value = getNested(data, element.getAttribute("data-i18n-ph"));
    if (value !== null) element.setAttribute("placeholder", value);
  });
}

async function switchLanguage(lang) {
  const nextLang = SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
  // 先确保英文基线可用，供 detail/article 等动态页面的框架文案使用
  if (!translations["en"]) await loadLanguage("en");
  if (!window.__i18n) window.__i18n = { lang: "en", data: translations["en"] || null };
  const data = await loadLanguage(nextLang);
  if (!data) return;

  currentLang = nextLang;
  applyTranslations(data);

  document.documentElement.setAttribute("lang", data.meta.lang);
  document.body.setAttribute("dir", data.meta.dir || "ltr");

  const langCode = document.querySelector(".lang-btn .lang-code");
  const langLabel = document.querySelector(".lang-btn .lang-label");
  if (langCode) langCode.textContent = data.meta.code;
  if (langLabel) langLabel.textContent = data.meta.name;

  document.querySelectorAll(".lang-menu button").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === nextLang);
  });

  try {
    localStorage.setItem("preferred_lang", nextLang);
  } catch (error) {
    // Storage may be unavailable in private browsing.
  }

  // 暴露当前语言数据并广播事件，供动态渲染页面（detail/article）刷新框架文案
  window.__i18n = { lang: nextLang, data: data };
  window.dispatchEvent(new CustomEvent("languagechanged", { detail: { lang: nextLang, data: data } }));
}

function detectInitialLang() {
  try {
    const saved = localStorage.getItem("preferred_lang");
    if (SUPPORTED_LANGS.includes(saved)) return saved;
  } catch (error) {
    // Keep the English baseline.
  }

  const browserLang = (navigator.language || DEFAULT_LANG).slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(browserLang) ? browserLang : DEFAULT_LANG;
}

function initLanguageMenu() {
  const button = document.querySelector(".lang-btn");
  const menu = document.querySelector(".lang-menu");
  if (!button || !menu) return;

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = menu.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll("button").forEach((item) => {
    item.addEventListener("click", () => {
      switchLanguage(item.dataset.lang);
      menu.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", () => {
    menu.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
  });
}

function initMobileMenu() {
  const button = document.querySelector(".menu-toggle");
  const links = document.querySelector(".nav-links");
  if (!button || !links) return;

  button.addEventListener("click", () => {
    const isOpen = links.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("open");
      button.setAttribute("aria-expanded", "false");
    });
  });
}

function initProductDropdown() {
  const items = document.querySelectorAll(".has-dropdown");
  if (!items.length) return;

  items.forEach((item) => {
    const trigger = item.querySelector(":scope > a");
    const dropdownLinks = item.querySelectorAll(".nav-dropdown a");
    if (!trigger) return;

    const setOpen = (isOpen) => {
      item.classList.toggle("dropdown-open", isOpen);
      trigger.setAttribute("aria-expanded", String(isOpen));
    };

    item.addEventListener("mouseenter", () => setOpen(true));
    item.addEventListener("mouseleave", () => setOpen(false));
    item.addEventListener("focusin", () => setOpen(true));
    item.addEventListener("focusout", (event) => {
      if (!item.contains(event.relatedTarget)) setOpen(false);
    });

    trigger.addEventListener("click", (event) => {
      // 任何宽度下点击 Products 都展开/收起下拉，不跳转；
      // 桌面 hover 显示依赖 CSS :hover，点击用 dropdown-open class 保持展开。
      event.preventDefault();
      const willOpen = !item.classList.contains("dropdown-open");
      setOpen(willOpen);
    });

    dropdownLinks.forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });

    document.addEventListener("click", (event) => {
      if (!item.contains(event.target)) setOpen(false);
    });
  });
}

function initProductFilters() {
  const buttons = document.querySelectorAll(".filter-btn");
  const cards = document.querySelectorAll(".product-card[data-category]");
  if (!buttons.length || !cards.length) return;

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      buttons.forEach((item) => item.classList.toggle("active", item === button));
      cards.forEach((card) => {
        const show = filter === "all" || card.dataset.category === filter;
        card.classList.toggle("hidden", !show);
      });
    });
  });
}

function showToast(message, type = "success") {
  let container = document.querySelector("#toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.setAttribute("aria-live", "polite");
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  // 触发进入动画
  requestAnimationFrame(() => toast.classList.add("show"));
  // 3 秒后淡出并移除
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

function initInquiryForm() {
  const form = document.querySelector("#inquiry-form");
  if (!form) return;

  const submitButton = form.querySelector('[type="submit"]');
  const whatsappButton = form.querySelector("#contact-whatsapp");
  const status = form.querySelector("#form-status");
  const accessKey = form.querySelector("#web3forms-access-key");

  const setStatus = (key, type = "") => {
    if (!status) return;
    status.textContent = getNested(translations[currentLang], key) || "";
    status.classList.toggle("is-success", type === "success");
    status.classList.toggle("is-error", type === "error");
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const email = form.querySelector("#f-email")?.value.trim();
    const whatsapp = form.querySelector("#f-whatsapp")?.value.trim();
    if (!email && !whatsapp) {
      setStatus("contact.statusContactRequired", "error");
      showToast(getNested(translations[currentLang], "contact.statusContactRequired") || "Please provide an email address or WhatsApp number so we can reply.", "error");
      return;
    }

    if (!accessKey?.value || accessKey.value === "WEB3FORMS_ACCESS_KEY") {
      setStatus("contact.statusConfig", "error");
      showToast(getNested(translations[currentLang], "contact.statusConfig") || "The inquiry form is being configured. Please contact us via WhatsApp or WeChat.", "error");
      return;
    }

    setStatus("contact.statusSending");
    if (submitButton) submitButton.disabled = true;

    try {
      const product = form.querySelector("#f-product")?.value || "Hydraulic product";
      const subject = form.querySelector('[name="subject"]');
      if (subject) subject.value = `New website inquiry - ${product}`;
      const payload = Object.fromEntries(new FormData(form));
      const response = await fetch(WEB3FORMS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Submission failed");

      form.reset();
      setStatus("contact.statusSuccess", "success");
      showToast(getNested(translations[currentLang], "contact.statusSuccess") || "Thank you. Your inquiry has been sent successfully.", "success");
    } catch (error) {
      console.error("Web3Forms submission failed:", error);
      setStatus("contact.statusError", "error");
      showToast(getNested(translations[currentLang], "contact.statusError") || "We could not send your inquiry. Please try again or contact us via WhatsApp or WeChat.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  whatsappButton?.addEventListener("click", () => {
    window.open(WHATSAPP_URL, "_blank", "noopener");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  switchLanguage(detectInitialLang());
  initLanguageMenu();
  initMobileMenu();
  initProductDropdown();
  initProductFilters();
  initInquiryForm();
});
