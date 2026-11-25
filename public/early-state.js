// Apply saved language and theme before paint.
try {
  var lang = localStorage.getItem('mv-lang');
  if (lang !== 'ar' && lang !== 'en') lang = 'ar';
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
} catch {
  document.documentElement.setAttribute('lang', 'ar');
  document.documentElement.setAttribute('dir', 'rtl');
}

try {
  localStorage.removeItem('mv-theme');
  var theme = localStorage.getItem('mv-theme-v2');
  theme = theme ? JSON.parse(theme) : 'light';
  if (theme !== 'light' && theme !== 'dark') theme = 'light';
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'dark' ? '#11100f' : '#f8f7f4');
} catch {
  document.documentElement.setAttribute('data-theme', 'light');
}
