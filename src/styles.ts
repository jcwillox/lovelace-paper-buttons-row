export function mapStyle(styleObject: Record<string, unknown>, prefix = "") {
  return Object.keys(styleObject)
    .reduce((style: string[], rule) => {
      return [...style, `${prefix}${rule}: ${styleObject[rule]};`];
    }, [])
    .join(" ");
}

// merge an array of objects into a single object
export function coerceObject(data = {}) {
  return Array.isArray(data)
    ? data.reduce((obj, item) => ({ ...obj, ...item }), {})
    : data;
}
