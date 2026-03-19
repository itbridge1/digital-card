const APP_THEME = {
  primaryColor: "#1d4ed8",
  secondaryColor: "#0ea5a5",
  backgroundColor: "#f3f6fb",
  surfaceColor: "#ffffff",
  textColor: "#1f2937",
};

const hexToRgb = (hexColor) => {
  const normalized = hexColor.replace("#", "");
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : normalized;

  const intValue = Number.parseInt(value, 16);

  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
};

const hexToRgba = (hexColor, alpha = 1) => {
  const { r, g, b } = hexToRgb(hexColor);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const applyAppThemeVariables = (theme = APP_THEME) => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const primaryRgb = hexToRgb(theme.primaryColor);
  const secondaryRgb = hexToRgb(theme.secondaryColor);

  root.style.setProperty("--app-color-primary", theme.primaryColor);
  root.style.setProperty("--app-color-secondary", theme.secondaryColor);
  root.style.setProperty("--app-color-background", theme.backgroundColor);
  root.style.setProperty("--app-color-surface", theme.surfaceColor);
  root.style.setProperty("--app-color-text", theme.textColor);
  root.style.setProperty(
    "--app-color-primary-rgb",
    `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`,
  );
  root.style.setProperty(
    "--app-color-secondary-rgb",
    `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`,
  );
};

const antdThemeConfig = {
  token: {
    colorPrimary: APP_THEME.primaryColor,
    colorInfo: APP_THEME.primaryColor,
    colorLink: APP_THEME.primaryColor,
    colorWarning: APP_THEME.secondaryColor,
    colorTextBase: APP_THEME.textColor,
    colorBgBase: APP_THEME.surfaceColor,
    borderRadius: 10,
  },
};

export { APP_THEME, antdThemeConfig, applyAppThemeVariables, hexToRgba };