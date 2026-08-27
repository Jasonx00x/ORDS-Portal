export type ConsultationEmbedTheme = "dark" | "light";
export type ConsultationEmbedLayout = "compact" | "standard";

export type ConsultationEmbedConfig = {
  accent: string;
  layout: ConsultationEmbedLayout;
  showIntro: boolean;
  theme: ConsultationEmbedTheme;
};

export const defaultConsultationEmbedConfig: ConsultationEmbedConfig = {
  accent: "#c9a85c",
  layout: "standard",
  showIntro: true,
  theme: "light",
};

const hexColorPattern = /^#[0-9a-f]{6}$/i;

export function parseConsultationEmbedConfig(params: Record<string, string | string[] | undefined>) {
  const value = (key: string) => {
    const candidate = params[key];
    return Array.isArray(candidate) ? candidate[0] : candidate;
  };
  const accentValue = value("accent");
  const accent = accentValue?.startsWith("#") ? accentValue : `#${accentValue ?? ""}`;

  return {
    accent: hexColorPattern.test(accent) ? accent.toLowerCase() : defaultConsultationEmbedConfig.accent,
    layout: value("layout") === "compact" ? "compact" : "standard",
    showIntro: value("intro") !== "0",
    theme: value("theme") === "dark" ? "dark" : "light",
  } satisfies ConsultationEmbedConfig;
}

export function consultationEmbedSearchParams(config: ConsultationEmbedConfig) {
  const params = new URLSearchParams({
    accent: config.accent.slice(1),
    embed: "1",
    intro: config.showIntro ? "1" : "0",
    layout: config.layout,
    theme: config.theme,
  });
  return params.toString();
}
