function formatMoney(n) {
  const sign = n >= 0 ? "" : "-";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPct(n) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function formatExposure(n) {
  const pct = Math.round(n * 100);
  if (pct > 0) return `+${pct}% long`;
  if (pct < 0) return `${pct}% short`;
  return "Flat";
}

function formatExposureShort(n) {
  const pct = Math.round(n * 100);
  if (pct > 0) return `+${pct}%`;
  if (pct < 0) return `${pct}%`;
  return "0%";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeHeadlines(day) {
  if (!day) return [];
  if (day.headlines?.length) return day.headlines;
  if (day.headline) {
    return [
      {
        tag: day.tag,
        category: day.category,
        headline: day.headline,
        context: day.context,
      },
    ];
  }
  return [];
}

function renderHeadlinesList(headlines, { compact = false } = {}) {
  if (!headlines.length) return "";

  return headlines
    .map(
      (headline, index) => `
      <article class="headline-item${compact ? " headline-item-compact" : ""}">
        <div class="headline-item-top">
          <span class="headline-item-index">${index + 1}</span>
          <span class="headline-item-tag">${escapeHtml(headline.tag || "NEWS")}</span>
          ${headline.category ? `<span class="headline-item-category">${escapeHtml(headline.category)}</span>` : ""}
        </div>
        <p class="headline-item-text">${escapeHtml(headline.headline)}</p>
        ${
          headline.context
            ? `<p class="headline-item-context">${escapeHtml(headline.context)}</p>`
            : ""
        }
      </article>`
    )
    .join("");
}

function formatTimer(seconds) {
  const safe = Math.max(0, seconds | 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function getTradeSecondsRemaining(tradeDeadlineAt) {
  if (!tradeDeadlineAt) return null;
  return Math.max(0, Math.ceil((tradeDeadlineAt - Date.now()) / 1000));
}
