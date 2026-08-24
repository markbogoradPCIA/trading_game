class PriceChart {
  constructor(canvas, theme = "dark") {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.priceData = [];
    this.exposureData = [];
    this.theme = theme;
  }

  setData(pricePoints, exposurePoints = []) {
    this.priceData = pricePoints;
    this.exposureData = exposurePoints;
    this.draw();
  }

  draw() {
    const { canvas, ctx, priceData, theme } = this;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 16, bottom: 36, left: 52 };
    const light = theme === "light";

    ctx.clearRect(0, 0, w, h);

    if (priceData.length < 2) {
      ctx.fillStyle = light ? "#666" : "#64748b";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("Chart builds as days progress", pad.left, h / 2);
      return;
    }

    const prices = priceData.map((d) => d.price);
    const min = Math.min(...prices) * 0.98;
    const max = Math.max(...prices) * 1.02;
    const chartW = w - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;

    const x = (i) => pad.left + (i / (priceData.length - 1)) * chartW;
    const y = (p) => pad.top + chartH - ((p - min) / (max - min)) * chartH;

    ctx.strokeStyle = light ? "rgba(0,0,0,0.08)" : "#1e293b";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gy = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(w - pad.right, gy);
      ctx.stroke();
      const val = max - ((max - min) / 4) * i;
      ctx.fillStyle = light ? "#555" : "#64748b";
      ctx.font = "11px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`$${val.toFixed(2)}`, pad.left - 6, gy + 4);
    }

    const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
    gradient.addColorStop(0, light ? "rgba(19, 104, 206, 0.2)" : "rgba(56, 189, 248, 0.25)");
    gradient.addColorStop(1, "rgba(56, 189, 248, 0)");
    ctx.beginPath();
    ctx.moveTo(x(0), y(prices[0]));
    for (let i = 1; i < prices.length; i++) ctx.lineTo(x(i), y(prices[i]));
    ctx.lineTo(x(prices.length - 1), pad.top + chartH);
    ctx.lineTo(x(0), pad.top + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x(0), y(prices[0]));
    for (let i = 1; i < prices.length; i++) ctx.lineTo(x(i), y(prices[i]));
    ctx.strokeStyle = light ? "#1368ce" : "#38bdf8";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const last = prices.length - 1;
    ctx.beginPath();
    ctx.arc(x(last), y(prices[last]), 6, 0, Math.PI * 2);
    ctx.fillStyle = light ? "#1368ce" : "#38bdf8";
    ctx.fill();

    ctx.fillStyle = light ? "#555" : "#64748b";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    const labelEvery = Math.max(1, Math.floor(priceData.length / 5));
    for (let i = 0; i < priceData.length; i += labelEvery) {
      ctx.fillText(priceData[i].date || `D${i}`, x(i), h - 8);
    }
  }
}
