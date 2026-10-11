import { z } from "zod";

export const categories: readonly string[] = ["全部", "蔬菜", "水果", "肉禽蛋", "水产海鲜", "乳品冷藏"];
export type Product = { id: string; name: string; category: string; spec: string; price: number; stock: number; image: string; origin: string; storage: string; description: string };
export const products: readonly Product[] = [
  { id: "tomato", name: "精选番茄", category: "蔬菜", spec: "500g/份", price: 690, stock: 20, image: "tomatoes.png", origin: "山东寿光（演示）", storage: "阴凉通风处保存，建议尽早食用", description: "饱满红润，酸甜多汁。切一盘凉拌，或煮一碗暖暖的番茄汤，让简单的一餐也有滋有味。" },
  { id: "apple", name: "红富士苹果", category: "水果", spec: "500g/份", price: 890, stock: 16, image: "apples.png", origin: "山东烟台（演示）", storage: "冷藏保存，食用前清洗", description: "清脆的口感，恰好的甜。给早餐添一份果香，也为午后留一点清爽。" },
  { id: "egg", name: "鲜鸡蛋", category: "肉禽蛋", spec: "10枚/盒", price: 1290, stock: 12, image: "eggs.png", origin: "浙江（演示）", storage: "冷藏保存，请充分加热后食用", description: "一盒日常好食材。无论是清晨的水煮蛋，还是晚餐的一份蛋羹，都简单又满足。" },
  { id: "greens", name: "上海青", category: "蔬菜", spec: "300g/份", price: 490, stock: 8, image: "greens.png", origin: "浙江杭州（演示）", storage: "冷藏保存，建议尽早食用", description: "叶片鲜嫩，菜梗清脆。大火快炒，留住一口清爽的蔬菜本味。" },
  { id: "milk", name: "鲜牛奶", category: "乳品冷藏", spec: "250ml/瓶", price: 790, stock: 3, image: "milk.png", origin: "浙江（演示）", storage: "2–6℃冷藏，开封后尽快饮用", description: "醇香细腻，早餐刚刚好。搭配面包或燕麦，为一天留一个从容的开始。" },
  { id: "salmon", name: "三文鱼切块", category: "水产海鲜", spec: "200g/份", price: 2990, stock: 0, image: "salmon.png", origin: "挪威（演示）", storage: "冷藏保存，充分加热后食用", description: "肉质细腻，适合香煎或烘烤。此商品当前售罄，可先逛逛其他食材。" },
];

const cartSchema = z.object({ productId: z.string(), quantity: z.number().int().positive(), selected: z.boolean() });
const addressSchema = z.object({ id: z.string(), name: z.string().min(1), phone: z.string().regex(/^1\d{10}$/), district: z.enum(["西湖区", "上城区"]), detail: z.string().min(1), isDefault: z.boolean() });
const lineSchema = z.object({ productId: z.string(), name: z.string(), spec: z.string(), price: z.number().int().nonnegative(), quantity: z.number().int().positive(), image: z.string() });
export const statuses = ["全部", "待确认", "待配送", "配送中", "已完成", "已取消"] as const;
const orderSchema = z.object({ id: z.string(), created: z.number(), status: z.enum(["待确认", "待配送", "配送中", "已完成", "已取消"]), address: addressSchema, lines: z.array(lineSchema), note: z.string(), sample: z.boolean(), reason: z.string() });
const accountSchema = z.object({ phone: z.enum(["13800000001", "13800000002"]), cart: z.array(cartSchema), addresses: z.array(addressSchema), orders: z.array(orderSchema) });
export const storeSchema = z.object({ version: z.literal(1), started: z.number(), session: z.enum(["13800000001", "13800000002"]).nullable(), visitor: z.array(cartSchema), accounts: z.array(accountSchema).length(2) });
export type CartItem = z.infer<typeof cartSchema>;
export type Address = z.infer<typeof addressSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Account = z.infer<typeof accountSchema>;
export type Store = z.infer<typeof storeSchema>;
export type Phone = Account["phone"];
export type OrderStatus = typeof statuses[number];
export const storageKey = "xianlin-demo-v1";
export const duration = 7 * 24 * 60 * 60 * 1000;

export function initialStore(now: number): Store {
  return { version: 1, started: now, session: null, visitor: [], accounts: [
    { phone: "13800000001", cart: [], addresses: [], orders: [] },
    { phone: "13800000002", cart: [], addresses: [], orders: [] },
  ] };
}

export function productById(id: string): Product {
  const product = products.find((item) => item.id === id);
  if (!product) throw new Error(`Unknown grocery product: ${id}`);
  return product;
}

export function accountFor(store: Store, phone: Phone): Account {
  const account = store.accounts.find((item) => item.phone === phone);
  if (!account) throw new Error(`Demo account is missing: ${phone}`);
  return account;
}

export function replaceAccount(store: Store, account: Account): Store {
  return { ...store, accounts: store.accounts.map((item) => item.phone === account.phone ? account : item) };
}

export function currentCart(store: Store): CartItem[] {
  return store.session ? accountFor(store, store.session).cart : store.visitor;
}

export function replaceCart(store: Store, cart: CartItem[]): Store {
  return store.session ? replaceAccount(store, { ...accountFor(store, store.session), cart }) : { ...store, visitor: cart };
}

export function availableStock(product: Product, account: Account | null): number {
  const occupied = account ? account.orders.filter((order) => order.status !== "已取消" && !order.sample).flatMap((order) => order.lines).filter((line) => line.productId === product.id).reduce((sum, line) => sum + line.quantity, 0) : 0;
  return product.stock - occupied;
}

export function mergeCart(guest: CartItem[], account: Account): CartItem[] {
  if (guest.length === 0) return account.cart;
  const existing = account.cart.map((item) => {
    const incoming = guest.find((line) => line.productId === item.productId);
    return { ...item, quantity: item.quantity + (incoming?.quantity ?? 0), selected: Boolean(incoming?.selected) && availableStock(productById(item.productId), account) > 0 };
  });
  return [...existing, ...guest.filter((item) => !account.cart.some((line) => line.productId === item.productId)).map((item) => ({ ...item, selected: item.selected && availableStock(productById(item.productId), account) > 0 }))];
}

export function money(cents: number): string { return `¥${(cents / 100).toFixed(2)}`; }
export function cartTotal(items: CartItem[]): number { return items.filter((item) => item.selected).reduce((sum, item) => sum + productById(item.productId).price * item.quantity, 0); }
export function orderTotal(order: Order): number { return order.lines.reduce((sum, line) => sum + line.price * line.quantity, 0); }
export function dateLabel(time: number): string { return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(time); }
export function expiryLabel(time: number): string { return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(time); }

export function sampleOrders(started: number): Order[] {
  const address: Address = { id: "sample", name: "示例收货人", phone: "13800000001", district: "西湖区", detail: "演示路1号演示小区1幢101室（虚构）", isDefault: false };
  return (["待配送", "配送中", "已完成", "已取消"] as const).map((status, index) => ({
    id: `SAMPLE-00${index + 1}`, created: started - (index + 1) * 86400000, status, address,
    lines: products.slice(0, 2).map((p) => ({ productId: p.id, name: p.name, spec: p.spec, image: p.image, price: p.price, quantity: 1 })),
    note: "仅供展示，不产生实际配送", sample: true, reason: status === "已取消" ? "示例情景：商品缺货，模拟取消" : "",
  }));
}

export function loadStore(): Store {
  const raw = localStorage.getItem(storageKey);
  if (raw === null) return initialStore(Date.now());
  const result = storeSchema.safeParse(JSON.parse(raw));
  if (!result.success) throw new Error(`Cannot read saved grocery demo: ${result.error.message}`);
  const state = result.data;
  if (new Set(state.accounts.map((account) => account.phone)).size !== 2) throw new Error("Saved demo must contain two distinct accounts.");
  [...state.visitor, ...state.accounts.flatMap((account) => account.cart)].forEach((item) => productById(item.productId));
  return state;
}
