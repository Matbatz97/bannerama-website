// Banner price maths shared by the order form and the products page.
// quote() in server.js mirrors this and has the final say on every order.

const DEFAULT_PRICING = {
  pvc: { perSqm: 14, minCharge: 25 },
  mesh: { perSqm: 18, minCharge: 30 },
  roller: { sizes: { '850x2000': 59, '1000x2000': 79, '1200x2000': 99 }, premiumStand: 25 },
  finishing: { eyelets: 0, scaffold: 6, hemmed: 0 },
  cableTies: 4
};

const gbp = n => '£' + n.toFixed(2);

function pocketMetres(s) {
  const w = s.widthCm, h = s.heightCm;
  return (s.pocketEdges === 'all' ? 2 * (w + h) : s.pocketEdges === 'sides' ? 2 * h : 2 * w) / 100;
}

// Returns every part of the price so pages can show the working, not just the total
function priceBanner(pricing, s) {
  const quantity = s.quantity || 1;
  const parts = { area: 0, rate: 0, print: 0, minApplied: false, finishing: 0, ties: 0, stand: 0 };

  if (s.type === 'roller') {
    const [wMm, hMm] = s.size.split('x').map(Number);
    parts.area = (wMm / 1000) * (hMm / 1000);
    parts.print = pricing.roller.sizes[s.size];
    parts.rate = parts.print / parts.area;
    parts.stand = s.stand === 'premium' ? pricing.roller.premiumStand : 0;
  } else {
    const rates = pricing[s.type];
    parts.area = (s.widthCm / 100) * (s.heightCm / 100);
    parts.rate = rates.perSqm;
    const print = parts.area * rates.perSqm;
    parts.minApplied = print < rates.minCharge;
    parts.print = Math.max(rates.minCharge, print);
    if (s.finishing === 'scaffold') parts.finishing = pocketMetres(s) * pricing.finishing.scaffold;
    if (s.cableTies) parts.ties = pricing.cableTies * Math.ceil(2 * (s.widthCm + s.heightCm) / 50 / 10);
  }

  const unit = parts.print + parts.finishing + parts.ties + parts.stand;
  const subtotal = unit * quantity;
  return { ...parts, unit, subtotal, vat: subtotal * 0.2, total: subtotal * 1.2 };
}
