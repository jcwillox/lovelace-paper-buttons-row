export function mapStyle(styleObject, prefix = "") {
  return Object.keys(styleObject)
    .reduce((style, rule) => {
      return [...style, `${prefix}${rule}: ${styleObject[rule]};`];
    }, [])
    .join(" ");
}

export function coerceObject(data = {}) {
  return Array.isArray(data)
    ? data.reduce((obj, item) => ({ ...obj, ...item }), {})
    : data;
}

export function applyTheme(element, themes, localTheme) {
  if (localTheme in themes.themes) {
    element.style.cssText = mapStyle(themes.themes[localTheme], "--");
  }
}
