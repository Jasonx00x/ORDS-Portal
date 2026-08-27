"use client";

import { useEffect, useMemo, useState } from "react";
import {
  consultationEmbedSearchParams,
  defaultConsultationEmbedConfig,
  type ConsultationEmbedConfig,
} from "@/lib/consultations/embed";

const accentOptions = ["#c9a85c", "#166534", "#1d4ed8", "#b42318", "#111827"];

type BookingEmbedBuilderProps = {
  notify: (message: string) => void;
  upcomingCount: number;
};

export function BookingEmbedBuilder({ notify, upcomingCount }: BookingEmbedBuilderProps) {
  const [config, setConfig] = useState<ConsultationEmbedConfig>(defaultConsultationEmbedConfig);
  const [origin, setOrigin] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);

  const widgetUrl = useMemo(() => {
    if (!origin) return "";
    return `${origin}/book-consultation?${consultationEmbedSearchParams(config)}`;
  }, [config, origin]);
  const embedCode = useMemo(() => {
    if (!widgetUrl) return "";
    return [
      `<div style="width:100%;max-width:1100px;margin:0 auto">`,
      `  <iframe data-ords-booking src="${widgetUrl}" title="Book an ORDS consultation" loading="lazy" style="width:100%;min-height:900px;border:0"></iframe>`,
      `</div>`,
      `<script async src="${origin}/booking-embed.js"></script>`,
    ].join("\n");
  }, [origin, widgetUrl]);

  function update<K extends keyof ConsultationEmbedConfig>(key: K, value: ConsultationEmbedConfig[K]) {
    setConfig((current) => ({ ...current, [key]: value }));
  }

  async function copy(value: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify(successMessage);
    } catch {
      notify("Clipboard access was blocked. Select the code and copy it manually.");
    }
  }

  return (
    <article className="portal-panel booking-live-card booking-embed-builder">
      <div className="booking-embed-head">
        <div>
          <div className="panel-kicker">Website Booking</div>
          <h3>Consultation calendar embed</h3>
          <p>Customize the public calendar, preview it, and publish the generated embed on the ORDS website.</p>
        </div>
        <div className="booking-embed-count"><strong>{upcomingCount}</strong><span>Upcoming bookings</span></div>
      </div>

      <div className="booking-embed-controls">
        <fieldset>
          <legend>Theme</legend>
          <div className="booking-segmented" aria-label="Widget theme">
            {(["light", "dark"] as const).map((theme) => (
              <button className={config.theme === theme ? "active" : ""} key={theme} onClick={() => update("theme", theme)} type="button">
                {theme === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Layout</legend>
          <div className="booking-segmented" aria-label="Widget layout">
            {(["standard", "compact"] as const).map((layout) => (
              <button className={config.layout === layout ? "active" : ""} key={layout} onClick={() => update("layout", layout)} type="button">
                {layout === "standard" ? "Standard" : "Compact"}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Accent</legend>
          <div className="booking-color-row">
            {accentOptions.map((color) => (
              <button
                aria-label={`Use accent ${color}`}
                className={config.accent === color ? "active" : ""}
                key={color}
                onClick={() => update("accent", color)}
                style={{ backgroundColor: color }}
                title={`Accent ${color}`}
                type="button"
              />
            ))}
            <label className="booking-custom-color" title="Custom accent color">
              <span>Custom</span>
              <input aria-label="Custom accent color" onChange={(event) => update("accent", event.target.value)} type="color" value={config.accent} />
            </label>
          </div>
        </fieldset>
        <label className="booking-embed-toggle">
          <input checked={config.showIntro} onChange={(event) => update("showIntro", event.target.checked)} type="checkbox" />
          <span><strong>Booking intro</strong><small>Show duration and timezone above the calendar</small></span>
        </label>
      </div>

      <div className="booking-embed-preview-head">
        <strong>Live preview</strong>
        <a href={widgetUrl || "/book-consultation"} rel="noreferrer" target="_blank">Open full preview</a>
      </div>
      <div className={`booking-embed-preview preview-${config.theme}`}>
        {widgetUrl && <iframe key={widgetUrl} src={widgetUrl} title="ORDS consultation calendar preview" />}
      </div>

      <label className="booking-embed-code">
        Embed code
        <textarea readOnly value={embedCode} />
      </label>
      <div className="button-row">
        <button className="inline-btn" disabled={!embedCode} onClick={() => copy(embedCode, "Website embed code copied.")} type="button">Copy Embed Code</button>
        <button className="inline-btn ghost-btn" disabled={!widgetUrl} onClick={() => copy(widgetUrl, "Booking URL copied.")} type="button">Copy Booking URL</button>
      </div>
    </article>
  );
}
