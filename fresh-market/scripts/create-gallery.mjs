import { writeFile } from 'node:fs/promises';

const pages = [
  ['01-home', '首页'], ['02-catalog', '商品列表'], ['03-product', '商品详情'],
  ['04-cart', '购物车'], ['10-checkout', '确认订单'], ['15-mine', '我的'],
  ['05-login', '演示登录'], ['09-addresses', '地址管理'], ['08-address-edit', '新增与编辑地址'],
  ['18-delivery', '配送说明'], ['11-success', '下单成功'], ['16-orders', '订单列表'], ['12-order-detail', '订单详情'],
];
const states = [
  ['06-checkout-no-address', '结算 · 未填写地址'], ['07-addresses-empty', '地址 · 空状态'],
  ['13-cancel-confirmation', '取消订单 · 确认'], ['14-order-cancelled', '订单 · 已取消'],
  ['17-sample-order', '示例订单 · 只读'], ['19-address-outside', '地址 · 超出配送范围'],
  ['20-addresses-outside', '地址管理 · 不可配送'], ['21-mine-guest', '我的 · 未登录'],
  ['22-orders-empty', '订单 · 空状态'], ['23-cart-empty', '购物车 · 空状态'],
  ['24-sold-out', '商品 · 已售罄'], ['25-low-stock', '商品 · 库存上限'],
  ['26-merge-overstock', '购物车 · 合并后库存不足'], ['27-expired', '演示 · 数据到期'],
];
function cards(entries) {
  return entries.map(([file, title], index) => `<article><header><span>${String(index + 1).padStart(2, '0')}</span><h3>${title}</h3></header><a href="/artifacts/${file}.png" target="_blank"><img src="/artifacts/${file}.png" alt="${title}" loading="lazy" width="393" height="852"></a></article>`).join('');
}
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>鲜邻 · 全页面原型</title><link rel="icon" href="/assets/products/tomatoes.png"><style>
*{box-sizing:border-box}body{margin:0;background:#f6f3ea;color:#293b27;font-family:"Microsoft YaHei",sans-serif}main{max-width:1500px;margin:auto;padding:64px 40px}a{color:inherit}.intro{display:flex;align-items:end;justify-content:space-between;gap:24px;padding-bottom:38px;border-bottom:1px solid #d9ddce}.eyebrow{color:#889473;font-size:12px;letter-spacing:4px}h1{font-family:serif;font-size:42px;letter-spacing:3px;font-weight:500;margin:14px 0}p{font-size:14px;color:#859177;line-height:1.9}.open{display:inline-block;text-decoration:none;background:#e85b20;color:white;border-radius:28px;padding:16px 26px;white-space:nowrap}h2{font-size:23px;font-weight:500;margin:46px 0 6px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:30px 26px;margin-top:25px}article header{display:flex;align-items:center;gap:12px;margin-bottom:13px}article header span{font-size:11px;color:#99a38b}h3{font-size:14px;font-weight:500;margin:0}img{display:block;width:100%;height:auto;border-radius:21px;border:1px solid #e1dfd4;box-shadow:0 8px 30px #2d43200a}.note{margin-top:45px;border-top:1px solid #d9ddce;padding-top:20px}@media(max-width:1000px){.grid{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){main{padding:30px 20px}.intro{display:block}.open{margin-top:12px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:24px 14px}h1{font-size:32px}h3{font-size:12px}}
</style></head><body><main><div class="intro"><div><div class="eyebrow">XIANLIN · FRESH EVERY DAY</div><h1>鲜邻，日日新鲜。</h1><p>生鲜商城 APP 高保真原型 · 13 个页面 / 14 个补充状态<br>奶油白 · 橄榄绿 · 暖橙，延续所选方案的自然质感。</p></div><a class="open" href="/">打开交互原型 ↗</a></div><h2>完整购物体验</h2><p>从发现新鲜好物，到加购、下单和订单管理。点击图片可查看原尺寸。</p><section class="grid">${cards(pages)}</section><h2>关键状态与边界场景</h2><p>覆盖未登录、空状态、配送范围、库存不足、订单取消与演示重置。</p><section class="grid">${cards(states)}</section><p class="note">演示账号可在登录页一键填入。订单仅用于演示，无需支付，不会真实配送。</p></main></body></html>`;
await writeFile(new URL('../screens.html', import.meta.url), html, 'utf8');
