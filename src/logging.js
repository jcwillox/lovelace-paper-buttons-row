export function logVersion(
  card,
  version,
  primaryColor,
  secondaryColor = "white"
) {
  console.info(
    `%c ${card.toUpperCase()} %c ${version} `,
    `color: ${secondaryColor}; background: ${primaryColor}; font-weight: 700;`,
    `color: ${primaryColor}; background: ${secondaryColor}; font-weight: 700;`
  );
}
