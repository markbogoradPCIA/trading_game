class TradingGame {
  constructor(scenario) {
    this.scenario = scenario;
    this.reset();
  }

  reset() {
    const { startingCash } = this.scenario.meta;
    this.cash = startingCash;
    this.shares = 0;
    this.dayIndex = 0;
    this.history = [];
    this.actions = [];
    this.exposureHistory = [];
    this.prices = this._buildPriceSeries();
    this.finished = false;
    this.currentExposure = 0;
  }

  _buildPriceSeries() {
    let price = this.scenario.meta.startPrice;
    const series = [{ day: 0, date: "Start", price, change: 0 }];

    for (const day of this.scenario.days) {
      price = price * (1 + day.change / 100);
      series.push({
        day: day.day,
        date: day.date,
        price: Math.round(price * 100) / 100,
        change: day.change,
      });
    }
    return series;
  }

  get currentDay() {
    return this.scenario.days[this.dayIndex] ?? null;
  }

  get currentPrice() {
    return this.prices[this.dayIndex + 1]?.price ?? this.prices[0].price;
  }

  get portfolioValue() {
    return this.cash + this.shares * this.currentPrice;
  }

  get exposure() {
    const pv = this.portfolioValue;
    if (pv === 0) return 0;
    return (this.shares * this.currentPrice) / pv;
  }

  get totalDays() {
    return this.scenario.days.length;
  }

  get isLastDay() {
    return this.dayIndex >= this.totalDays - 1;
  }

  setExposure(targetExposure) {
    if (this.finished) return null;

    targetExposure = Math.max(-1, Math.min(1, targetExposure));
    const price = this.currentPrice;
    const portfolioValue = this.cash + this.shares * price;
    const newShares = (targetExposure * portfolioValue) / price;

    this.shares = newShares;
    this.cash = portfolioValue - newShares * price;
    this.currentExposure = targetExposure;

    return this._recordAction(targetExposure, price);
  }

  _recordAction(exposure, price) {
    const action = {
      day: this.currentDay.day,
      date: this.currentDay.date,
      exposure,
      exposurePct: Math.round(exposure * 100),
      price,
      portfolioValue: this.portfolioValue,
    };
    this.actions.push(action);
    this.exposureHistory.push({
      date: this.currentDay.date,
      exposure,
      dayIndex: this.dayIndex,
    });
    return action;
  }

  advance() {
    if (this.finished) return false;

    this.history.push({
      dayIndex: this.dayIndex,
      price: this.currentPrice,
      portfolioValue: this.portfolioValue,
      cash: this.cash,
      shares: this.shares,
      exposure: this.exposure,
    });

    if (this.isLastDay) {
      this.finished = true;
      return true;
    }

    this.dayIndex += 1;
    return true;
  }

  getChartData() {
    return this.prices.slice(0, this.dayIndex + 2);
  }

  getExposureChartData() {
    return this.exposureHistory.map((e, i) => ({
      date: e.date,
      exposure: e.exposure,
      priceIndex: i + 1,
    }));
  }

  getBuyAndHoldReturn() {
    const start = this.scenario.meta.startingCash;
    const end =
      (start / this.scenario.meta.startPrice) *
      this.prices[this.prices.length - 1].price;
    return this._resultRow(start, end);
  }

  getAlwaysFlatReturn() {
    const start = this.scenario.meta.startingCash;
    return this._resultRow(start, start);
  }

  _resultRow(start, end) {
    end = Math.round(end * 100) / 100;
    return {
      start,
      end,
      pnl: Math.round((end - start) * 100) / 100,
      pct: Math.round(((end - start) / start) * 10000) / 100,
    };
  }

  getResults() {
    const start = this.scenario.meta.startingCash;
    const end = Math.round(this.portfolioValue * 100) / 100;
    return {
      start,
      end,
      pnl: Math.round((end - start) * 100) / 100,
      pct: Math.round(((end - start) / start) * 10000) / 100,
      actions: this.actions,
      exposureHistory: this.exposureHistory,
      buyAndHold: this.getBuyAndHoldReturn(),
      alwaysFlat: this.getAlwaysFlatReturn(),
    };
  }

  static simulate(scenario, exposurePath) {
    const game = new TradingGame(scenario);
    for (let i = 0; i < game.totalDays; i++) {
      game.dayIndex = i;
      const exposure = exposurePath[i] ?? exposurePath[exposurePath.length - 1] ?? 0;
      game.setExposure(exposure);
      game.advance();
    }
    return game.getResults();
  }

  static simulateArchetypes(scenario) {
    if (!scenario.archetypes) return [];
    return scenario.archetypes.map((arch) => ({
      name: arch.name,
      description: arch.description,
      ...TradingGame.simulate(scenario, arch.exposures),
    }));
  }
}
