/* ============================================
   i18n.js — 多语言切换核心脚本
   功能：加载语言文件、替换页面文字、记住选择、
        自动识别浏览器语言、RTL 支持
   ============================================ */

// 支持的语言列表（要新增语言，在此加一项，并在 lang/ 目录加对应 json 文件）
const SUPPORTED_LANGS = ['en', 'fr', 'ar', 'pt'];
const DEFAULT_LANG = 'en';

// 翻译数据缓存
let translations = {};
let currentLang = DEFAULT_LANG;

/* 根据 key 路径（如 "hero.title"）从对象中取值 */
function getNested(obj, path) {
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : null), obj);
}

/* 加载某语言的 json 文件 */
async function loadLanguage(lang) {
  if (translations[lang]) return translations[lang];
  try {
    const res = await fetch(`lang/${lang}.json`);
    if (!res.ok) throw new Error('lang file not found');
    const data = await res.json();
    translations[lang] = data;
    return data;
  } catch (e) {
    console.error('加载语言文件失败:', lang, e);
    return null;
  }
}

/* 把页面上所有 data-i18n 元素替换成对应语言文字 */
function applyTranslations(data) {
  // 文本内容
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = getNested(data, key);
    if (val !== null) {
      // 允许 hero.title 中的 <em> 标签
      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = val;
      } else {
        el.textContent = val;
      }
    }
  });
  // 占位符 placeholder
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const val = getNested(data, key);
    if (val !== null) el.setAttribute('placeholder', val);
  });
}

/* 切换语言主函数 */
async function switchLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;
  const data = await loadLanguage(lang);
  if (!data) return;

  currentLang = lang;
  applyTranslations(data);

  // 设置文档语言和文字方向（阿拉伯语为 RTL）
  const dir = data.meta.dir || 'ltr';
  document.documentElement.setAttribute('lang', data.meta.lang);
  document.body.setAttribute('dir', dir);

  // 更新语言按钮显示
  const btnLabel = document.querySelector('.lang-btn .lang-label');
  if (btnLabel) btnLabel.textContent = data.meta.name;
  const btnFlag = document.querySelector('.lang-btn .lang-flag');
  if (btnFlag) btnFlag.textContent = data.meta.flag;

  // 高亮当前语言菜单项
  document.querySelectorAll('.lang-menu button').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-lang') === lang);
  });

  // 记住用户选择（保存在浏览器本地）
  try { localStorage.setItem('preferred_lang', lang); } catch (e) {}
}

/* 决定初次进入时显示哪种语言 */
function detectInitialLang() {
  // 1. 优先用户上次手动选择的语言
  let saved = null;
  try { saved = localStorage.getItem('preferred_lang'); } catch (e) {}
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;

  // 2. 其次用浏览器语言（法语区客户自动看到法语）
  const browser = (navigator.language || 'en').slice(0, 2).toLowerCase();
  if (SUPPORTED_LANGS.includes(browser)) return browser;

  // 3. 都不匹配则用默认语言
  return DEFAULT_LANG;
}

/* 页面加载后初始化 */
document.addEventListener('DOMContentLoaded', () => {
  // 初始化语言
  switchLanguage(detectInitialLang());

  // 语言按钮：点击展开/收起菜单
  const langBtn = document.querySelector('.lang-btn');
  const langMenu = document.querySelector('.lang-menu');
  if (langBtn && langMenu) {
    langBtn.addEventListener('click', e => {
      e.stopPropagation();
      langMenu.classList.toggle('open');
    });
    // 点击菜单项切换语言
    langMenu.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        switchLanguage(btn.getAttribute('data-lang'));
        langMenu.classList.remove('open');
      });
    });
    // 点击页面其它地方收起菜单
    document.addEventListener('click', () => langMenu.classList.remove('open'));
  }

  // 移动端导航菜单
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  // 询盘表单：提交时改用 WhatsApp / mailto（静态网站无后端）
  const form = document.querySelector('#inquiry-form');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const get = id => (document.getElementById(id) || {}).value || '';
      const text =
        `Inquiry from website%0A` +
        `Name: ${get('f-name')}%0A` +
        `Email: ${get('f-email')}%0A` +
        `Country: ${get('f-country')}%0A` +
        `WhatsApp: ${get('f-whatsapp')}%0A` +
        `Model: ${get('f-model')}%0A` +
        `Message: ${get('f-message')}`;
      // 替换成你的真实 WhatsApp 号码（国际格式，不加 + 和空格）
      const WHATSAPP_NUMBER = '8613800000000';
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
    });
  }
});
