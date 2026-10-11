import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { ArrowLeft, ArrowRight, CaretRight, Check, CheckCircle, Clock, House, SquaresFour, ShoppingCart, UserCircle, MapPin, MagnifyingGlass, Plus, Minus, Trash, Package, Truck, SealCheck, XCircle, SignOut, Info, Leaf, WarningCircle, Receipt, PencilSimple, ShieldCheck } from "@phosphor-icons/react";
import { BottomSheet, Carousel, FlowStack, KeyboardInput, KeyboardTextarea, MobileScroll, useFlow, type FlowScreen } from "./mobile";
import { accountFor, availableStock, cartTotal, categories, currentCart, dateLabel, duration, expiryLabel, initialStore, loadStore, mergeCart, money, orderTotal, productById, products, replaceAccount, replaceCart, sampleOrders, statuses, storageKey, type Account, type Address, type CartItem, type Order, type OrderStatus, type Phone, type Product, type Store } from "./market";
import "@fontsource/noto-serif-sc/600.css";
import "./prototype.css";

type Page = "home" | "catalog" | "product" | "cart" | "checkout" | "mine" | "login" | "addresses" | "address-edit" | "delivery" | "success" | "orders" | "order";
type Route = { page: Page; id: string };
type ConfirmAction = { title: string; detail: string; label: string; run: () => void };
type MarketContext = {
  store: Store; setStore: Dispatch<SetStateAction<Store>>; notify: (message: string) => void;
  selectedAddress: string; setSelectedAddress: Dispatch<SetStateAction<string>>;
  note: string; setNote: Dispatch<SetStateAction<string>>;
  quantity: number; setQuantity: Dispatch<SetStateAction<number>>;
  category: string; setCategory: Dispatch<SetStateAction<string>>;
  query: string; setQuery: Dispatch<SetStateAction<string>>;
  sort: string; setSort: Dispatch<SetStateAction<string>>;
  filter: OrderStatus; setFilter: Dispatch<SetStateAction<OrderStatus>>;
  confirm: (action: ConfirmAction) => void; resetNavigation: () => void;
};
const Context = createContext<MarketContext | null>(null);
function useMarket(): MarketContext { const value = useContext(Context); if (!value) throw new Error("Market context is unavailable."); return value; }
function useAccount(): Account | null { const { store } = useMarket(); return store.session ? accountFor(store, store.session) : null; }
function Photo({ product, className }: { product: Product; className: string }): ReactNode { return <img className={className} src={`/assets/products/${product.image}`} alt={product.name} draggable={false} />; }
function DemoNote(): ReactNode { return <span className="demo-label">演示商城 · 不收款不发货</span>; }
function Price({ value }: { value: number }): ReactNode { return <span className="price"><small>¥</small>{(value / 100).toFixed(2)}</span>; }
function Empty({ icon, title, detail, action, onAction }: { icon: ReactNode; title: string; detail: string; action: string; onAction: () => void }): ReactNode { return <div className="empty-state">{icon}<h2>{title}</h2><p>{detail}</p><button className="primary" onClick={onAction} data-testid="empty-action">{action}<ArrowRight size={17} /></button></div>; }
function SectionTitle({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }): ReactNode { return <div className="section-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{detail && <p>{detail}</p>}</div>; }

function screen(page: Page, id: string): FlowScreen {
  const route = { page, id };
  const toolbar = page !== "home";
  const footer = ["home", "catalog", "cart", "mine", "product", "checkout", "addresses", "order"].includes(page);
  return { id: `${page}:${id}`, headerHeight: toolbar ? 52 : 0, header: toolbar ? () => <Header route={route} /> : undefined,
    footerHeight: page === "cart" ? 132 : 66, footer: footer ? () => <Footer route={route} /> : undefined,
    render: () => <PageView route={route} /> };
}

const titles: Record<Page, string> = { home: "鲜邻", catalog: "逛逛鲜市", product: "商品详情", cart: "购物车", checkout: "确认订单", mine: "我的鲜邻", login: "演示登录", addresses: "收货地址", "address-edit": "编辑收货地址", delivery: "配送范围", success: "下单成功", orders: "我的订单", order: "订单详情" };

function Header({ route }: { route: Route }): ReactNode {
  const flow = useFlow();
  const root = ["catalog", "cart", "mine"].includes(route.page);
  return <div className="toolbar"><button className="icon-button" aria-label="返回" data-testid="back" onClick={() => flow.canGoBack ? flow.pop() : flow.replace(screen("home", ""))}>{root ? <Leaf size={23} /> : <ArrowLeft size={22} />}</button><h2>{route.page === "address-edit" && !route.id ? "添加收货地址" : titles[route.page]}</h2><span className="toolbar-wordmark">鲜邻</span></div>;
}

function Navigation({ current }: { current: Page }): ReactNode {
  const flow = useFlow(); const { store } = useMarket();
  const count = currentCart(store).reduce((sum, item) => sum + item.quantity, 0);
  const links = [{ page: "home", name: "首页", icon: House }, { page: "catalog", name: "分类", icon: SquaresFour }, { page: "cart", name: "购物车", icon: ShoppingCart }, { page: "mine", name: "我的", icon: UserCircle }] as const;
  return <nav className="bottom-nav" aria-label="主导航">{links.map(({ page, name, icon: Icon }) => <button key={page} data-testid={`nav-${page}`} className={current === page ? "active" : ""} onClick={() => flow.replace(screen(page, ""))}><span className="nav-icon"><Icon size={25} weight={current === page ? "fill" : "regular"} />{page === "cart" && count > 0 && <b>{count}</b>}</span><span>{name}</span></button>)}</nav>;
}

function useAdd(): (product: Product, count: number) => void {
  const { store, setStore, notify } = useMarket(); const account = useAccount();
  return (product, count) => {
    const items = currentCart(store); const old = items.find((item) => item.productId === product.id);
    const stock = availableStock(product, account);
    if ((old?.quantity ?? 0) + count > stock) { notify(stock === 0 ? "该商品已售罄" : `最多可购买${stock}份，请调整购物车数量`); return; }
    setStore((current) => { const cart = currentCart(current); return replaceCart(current, old ? cart.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + count } : item) : [...cart, { productId: product.id, quantity: count, selected: true }]); });
    notify(`已加入购物车 · ${product.name}`);
  };
}

function Footer({ route }: { route: Route }): ReactNode {
  const flow = useFlow(); const context = useMarket(); const { store, selectedAddress, setSelectedAddress, note, quantity, setQuantity, notify, setStore } = context;
  const account = useAccount(); const add = useAdd(); const cart = currentCart(store);
  const selected = cart.filter((item) => item.selected);
  const invalid = selected.some((item) => item.quantity > availableStock(productById(item.productId), account));
  const address = account?.addresses.find((item) => item.id === selectedAddress) ?? (!selectedAddress ? account?.addresses.find((item) => item.isDefault) : undefined);
  const [submitting, setSubmitting] = useState(false);
  function checkout(): void {
    if (!selected.length || invalid) { notify("请先核对购物车中的商品数量"); return; }
    if (!store.session) { flow.push(screen("login", "checkout")); return; }
    if (!selectedAddress) setSelectedAddress(account?.addresses.find((item) => item.isDefault)?.id ?? "");
    flow.push(screen("checkout", ""));
  }
  function submit(): void {
    if (!account || !address || address.district !== "西湖区" || selected.length === 0 || invalid || note.length > 200 || submitting) { notify("请核对商品及可配送的收货地址"); return; }
    setSubmitting(true);
    const now = Date.now();
    const order: Order = { id: `XL${now}`, created: now, status: "待确认", address: { ...address }, lines: selected.map((item) => { const p = productById(item.productId); return { productId: p.id, name: p.name, spec: p.spec, price: p.price, image: p.image, quantity: item.quantity }; }), note, sample: false, reason: "" };
    setStore((current) => { const profile = accountFor(current, account.phone); return replaceAccount(current, { ...profile, orders: [order, ...profile.orders], cart: profile.cart.filter((item) => !selected.some((line) => line.productId === item.productId)) }); });
    context.setNote(""); context.setSelectedAddress(""); flow.replace(screen("success", order.id));
  }
  if (route.page === "cart") return <><div className="cart-checkout"><button data-testid="cart-select-all" className="select-all" onClick={() => context.setStore((current) => replaceCart(current, currentCart(current).map((item) => ({ ...item, selected: availableStock(productById(item.productId), account) > 0 && !cart.filter((line) => availableStock(productById(line.productId), account) > 0).every((line) => line.selected) }))))}><span className={`check-box ${selected.length > 0 ? "checked" : ""}`}>{selected.length > 0 && <Check size={13} />}</span>全选</button><div className="cart-total"><span>合计 <Price value={cartTotal(cart)} /></span><small>配送费 ¥0.00</small></div><button data-testid="checkout" className="primary" disabled={!selected.length || invalid} onClick={checkout}>去下单 ({selected.reduce((s, i) => s + i.quantity, 0)})</button></div><Navigation current="cart" /></>;
  if (["home", "catalog", "mine"].includes(route.page)) return <Navigation current={route.page} />;
  if (route.page === "product") {
    const p = productById(route.id); const stock = availableStock(p, account); const already = cart.find((item) => item.productId === p.id)?.quantity ?? 0;
    return <div className="action-footer"><button className="icon-button" aria-label="查看购物车" data-testid="detail-cart" onClick={() => flow.push(screen("cart", ""))}><ShoppingCart size={26} /></button><div className="stepper"><button aria-label="减少数量" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}><Minus size={15} /></button><span>{quantity}</span><button aria-label="增加数量" disabled={quantity + already >= stock} onClick={() => setQuantity(quantity + 1)}><Plus size={15} /></button></div><button data-testid="detail-add" className="primary grow" disabled={stock === 0} onClick={() => add(p, quantity)}>{stock === 0 ? "暂时售罄" : "加入购物车"}</button></div>;
  }
  if (route.page === "checkout") return account ? <div className="action-footer"><div className="grow"><small className="muted">订单总额</small><Price value={cartTotal(cart)} /></div><button data-testid="submit-order" className="primary" disabled={submitting || !address || address.district !== "西湖区" || !selected.length || invalid || note.length > 200} onClick={submit}>{submitting ? "正在提交" : "提交演示订单"}<ArrowRight size={18} /></button></div> : null;
  if (route.page === "addresses") return account ? <div className="action-footer"><button className="primary grow" data-testid="add-address" onClick={() => flow.push(screen("address-edit", ""))}><Plus size={19} />新增收货地址</button></div> : null;
  if (route.page === "order") {
    const order = account?.orders.find((item) => item.id === route.id);
    return order?.status === "待确认" ? <div className="action-footer"><span className="muted grow">仅生成演示订单</span><button className="secondary" data-testid="cancel-order" onClick={() => context.confirm({ title: "取消这笔订单？", detail: "取消后将释放对应演示库存，订单不可恢复。", label: "确认取消", run: () => { if (!account) return; setStore((current) => { const profile = accountFor(current, account.phone); return replaceAccount(current, { ...profile, orders: profile.orders.map((item) => item.id === order.id && item.status === "待确认" ? { ...item, status: "已取消", reason: "用户主动取消" } : item) }); }); notify("订单已取消，演示库存已释放"); } })}>取消订单</button></div> : null;
  }
  return null;
}

function CategoryRail(): ReactNode {
  const { category, setCategory } = useMarket();
  return <Carousel ariaLabel="商品分类" className="category-rail" contentClassName="category-track">{categories.map((name) => <button data-testid={`category-${name}`} key={name} className={name === category ? "selected" : ""} onClick={() => setCategory(name)}>{name}</button>)}</Carousel>;
}
function Search({ jump }: { jump: boolean }): ReactNode {
  const flow = useFlow(); const { query, setQuery, setCategory } = useMarket();
  return <form className="search-field" onSubmit={(event) => { event.preventDefault(); if (jump) { setCategory("全部"); flow.push(screen("catalog", "")); } }}><MagnifyingGlass size={22} /><KeyboardInput data-testid="search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索商品" aria-label="搜索商品" enterKeyHint="search" />{query && <button type="button" aria-label="清空搜索" data-testid="search-clear" onClick={() => setQuery("")}><XCircle size={19} /></button>}</form>;
}

function Home(): ReactNode {
  const flow = useFlow(); const { category, setCategory, setQuantity } = useMarket(); const add = useAdd(); const account = useAccount();
  const visible = category === "全部" ? products.slice(0, 2) : products.filter((item) => item.category === category);
  const hero = visible[0];
  function detail(id: string): void { setQuantity(1); flow.push(screen("product", id)); }
  return <>
    <div className="home-top"><div className="brand-line"><span className="brand">鲜邻</span><span className="brand-tagline">日常的鲜，刚刚好</span></div><DemoNote /><button className="range-link" data-testid="home-delivery" onClick={() => flow.push(screen("delivery", ""))}><MapPin weight="fill" size={19} /><span>西湖区全区 · 配送费 ¥0.00</span><CaretRight size={16} /></button><Search jump={true} /></div>
    <CategoryRail />
    <div className="home-heading"><h1>今天，吃点新鲜的</h1><span className="short-rule" /><p>从邻里到餐桌，新鲜正好</p></div>
    {hero && <article className="hero-product"><button className="photo-button" data-testid={`product-${hero.id}`} onClick={() => detail(hero.id)}><Photo product={hero} className="hero-photo" /></button><div className="hero-caption"><div><h2>{hero.name}</h2><p>{hero.spec}</p><Price value={hero.price} /></div><button className="primary" data-testid={`add-${hero.id}`} disabled={availableStock(hero, account) === 0} onClick={() => add(hero, 1)}><ShoppingCart size={21} />{availableStock(hero, account) === 0 ? "暂时售罄" : "加入购物车"}</button></div></article>}
    {visible.slice(1).map((p) => <article className="home-second" key={p.id}><button className="photo-button" data-testid={`product-${p.id}`} onClick={() => detail(p.id)}><Photo product={p} className="secondary-photo" /></button><div><h2>{p.name}</h2><p>{p.spec}</p><div className="row-between"><Price value={p.price} /><button className="add-circle" data-testid={`add-${p.id}`} aria-label={`加购${p.name}`} onClick={() => add(p, 1)}><Plus size={23} /></button></div></div></article>)}
    <button className="browse-more" data-testid="browse-all" onClick={() => { setCategory("全部"); flow.push(screen("catalog", "")); }}>逛逛全部好食材<ArrowRight size={18} /></button>
  </>;
}

function Catalog(): ReactNode {
  const flow = useFlow(); const { query, category, sort, setSort, setQuantity } = useMarket(); const account = useAccount(); const add = useAdd();
  const filtered = products.filter((p) => (category === "全部" || p.category === category) && p.name.includes(query.trim()));
  const sorted = [...filtered].sort((a, b) => sort === "低价优先" ? a.price - b.price : sort === "高价优先" ? b.price - a.price : 0);
  return <><div className="page-pad"><Search jump={false} /></div><CategoryRail /><div className="catalog-summary"><span>{query ? `“${query}”` : category} · {sorted.length}件好食材</span><select data-testid="sort" aria-label="价格排序" value={sort} onChange={(e) => setSort(e.target.value)}><option>默认排序</option><option>低价优先</option><option>高价优先</option></select></div><div className="product-list">{sorted.map((p) => { const stock = availableStock(p, account); return <article className="product-row" key={p.id}><button className="photo-button" data-testid={`catalog-product-${p.id}`} onClick={() => { setQuantity(1); flow.push(screen("product", p.id)); }}><Photo product={p} className={`list-photo ${stock === 0 ? "sold-out" : ""}`} /></button><div className="product-description"><h3>{p.name}</h3><p>{p.spec}</p>{stock === 0 ? <span className="stock-label">暂时售罄</span> : stock <= 3 ? <span className="stock-label">仅剩{stock}份</span> : <span className="subtle-label">日常新鲜选</span>}<div className="row-between"><Price value={p.price} /><button className="add-circle" data-testid={`catalog-add-${p.id}`} aria-label={`加购${p.name}`} disabled={stock === 0} onClick={() => add(p, 1)}><Plus size={21} /></button></div></div></article>; })}</div>{sorted.length === 0 && <Empty icon={<MagnifyingGlass size={44} weight="light" />} title="暂时没找到" detail="换个关键词，或看看其他新鲜食材。" action="查看全部商品" onAction={() => flow.replace(screen("catalog", "reset"))} />}<p className="end-note">认真挑选，简单生活</p></>;
}

function ProductPage({ id }: { id: string }): ReactNode {
  const p = productById(id); const flow = useFlow(); const account = useAccount(); const stock = availableStock(p, account);
  return <><Photo product={p} className="detail-photo" /><div className="detail-info"><span className="eyebrow">鲜邻 · {p.category}</span><div className="row-between"><h1>{p.name}</h1><Price value={p.price} /></div><p>{p.spec}<span className="dot-divider">·</span>{stock > 0 ? `可选${stock}份` : "暂时售罄"}</p><button className="delivery-strip" data-testid="detail-delivery" onClick={() => flow.push(screen("delivery", ""))}><Truck size={22} /><span>西湖区全区 · 配送费 ¥0.00<small>演示配送范围，不提供实际配送</small></span><CaretRight size={17} /></button><h2 className="editorial-title">一口日常的好滋味</h2><p className="description-text">{p.description}</p><dl className="facts"><div><dt>售卖规格</dt><dd>{p.spec}</dd></div><div><dt>商品产地</dt><dd>{p.origin}</dd></div><div><dt>储存建议</dt><dd>{p.storage}</dd></div></dl><DemoNote /></div></>;
}

function Cart(): ReactNode {
  const { store, setStore, confirm, notify } = useMarket(); const flow = useFlow(); const account = useAccount(); const cart = currentCart(store);
  function changeQuantity(item: CartItem, value: number): void { const stock = availableStock(productById(item.productId), account); if (value < 1 || (value > stock && value > item.quantity)) { notify(`可购买数量为1至${stock}份`); return; } setStore((s) => replaceCart(s, currentCart(s).map((line) => line.productId === item.productId ? { ...line, quantity: value } : line))); }
  return <><div className="page-pad"><SectionTitle eyebrow="YOUR BASKET" title="把新鲜，一起带走" detail={store.session ? "核对食材和份数，再慢慢期待这一餐。" : "放心选购，下单前再登录演示账号。"} /><div className="thin-notice"><ShieldCheck size={17} />仅供演示 · 无需付款</div></div>{cart.length === 0 ? <Empty icon={<ShoppingCart size={52} weight="light" />} title="篮子里，还差一点新鲜" detail="选几样喜欢的食材，开始今天的好好吃饭。" action="去逛逛" onAction={() => flow.replace(screen("home", ""))} /> : <div className="cart-items">{cart.map((item) => { const p = productById(item.productId); const stock = availableStock(p, account); return <article className="cart-item" key={p.id}><button className={`check-box ${item.selected ? "checked" : ""}`} data-testid={`select-${p.id}`} aria-label={`选择${p.name}`} disabled={stock === 0} onClick={() => setStore((s) => replaceCart(s, currentCart(s).map((line) => line.productId === p.id ? { ...line, selected: !line.selected } : line)))}>{item.selected && <Check size={14} />}</button><button className="photo-button" onClick={() => flow.push(screen("product", p.id))}><Photo product={p} className="cart-photo" /></button><div className="cart-item-body"><div className="row-between"><h3>{p.name}</h3><button className="icon-button tiny" aria-label={`删除${p.name}`} data-testid={`delete-${p.id}`} onClick={() => confirm({ title: `移除${p.name}？`, detail: "这件商品将从购物车中移除，你随时可以重新选购。", label: "确认移除", run: () => setStore((s) => replaceCart(s, currentCart(s).filter((line) => line.productId !== p.id))) })}><Trash size={17} /></button></div><p>{p.spec}</p><div className="row-between"><Price value={p.price} /><div className="stepper"><button data-testid={`minus-${p.id}`} aria-label={`减少${p.name}`} disabled={item.quantity === 1 || stock === 0} onClick={() => changeQuantity(item, item.quantity - 1)}><Minus size={13} /></button><span data-testid={`quantity-${p.id}`}>{item.quantity}</span><button data-testid={`plus-${p.id}`} aria-label={`增加${p.name}`} disabled={item.quantity >= stock} onClick={() => changeQuantity(item, item.quantity + 1)}><Plus size={13} /></button></div></div>{item.quantity > stock && <span className="field-error">{stock === 0 ? "商品已售罄，请移除" : `仅剩${stock}份，请调整数量`}</span>}</div></article>; })}</div>}<p className="end-note">固定规格售卖 · 配送费 ¥0.00</p></>;
}

function AddressSummary({ address }: { address: Address }): ReactNode { return <><div className="address-name">{address.name}<span>{address.phone}</span>{address.isDefault && <b className="default-label">默认</b>}</div><p className="address-region">浙江省 杭州市 {address.district}</p><p className="address-detail">{address.detail}</p></>; }

function Checkout(): ReactNode {
  const { selectedAddress, note, setNote, store } = useMarket(); const account = useAccount(); const flow = useFlow();
  const address = account?.addresses.find((item) => item.id === selectedAddress) ?? (!selectedAddress ? account?.addresses.find((item) => item.isDefault) : undefined);
  const cart = currentCart(store).filter((item) => item.selected);
  return <div className="page-pad"><div className="checkout-address"><span className="eyebrow">送到这里</span><button data-testid="checkout-address" className="address-select" onClick={() => flow.push(screen("addresses", "select"))}><MapPin size={25} /><div className="grow">{address ? <AddressSummary address={address} /> : <><h3>添加收货地址</h3><p>让这一篮新鲜，有一个目的地</p></>}</div><CaretRight size={20} /></button>{address?.district === "上城区" && <p className="field-error">该地址超出配送范围，请更换地址</p>}</div><button className="delivery-strip" onClick={() => flow.push(screen("delivery", ""))}><Truck size={20} /><span>西湖区全区 · 免配送费</span><CaretRight size={16} /></button><div className="section-heading"><h2>本次选购</h2><span>{cart.reduce((sum, item) => sum + item.quantity, 0)}件商品</span></div>{cart.map((item) => { const p = productById(item.productId); return <div className="order-line" key={p.id}><Photo product={p} className="order-photo" /><div className="grow"><h3>{p.name}</h3><p>{p.spec}<span>×{item.quantity}</span></p></div><strong>{money(p.price * item.quantity)}</strong></div>; })}<label className="note-label" htmlFor="order-note">订单备注 <span>{note.length}/200</span></label><KeyboardTextarea id="order-note" data-testid="order-note" value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} placeholder="还有什么想备注的？（选填）" className="note-input" /><div className="amounts"><div><span>商品总额</span><strong>{money(cartTotal(cart))}</strong></div><div><span>配送费</span><strong>¥0.00</strong></div><div className="amount-total"><span>订单总额</span><Price value={cartTotal(cart)} /></div></div><div className="notice-panel"><Info size={20} /><p>仅生成演示订单<br /><span>不收款、不发货，不产生真实配送。</span></p></div></div>;
}

function Mine(): ReactNode {
  const flow = useFlow(); const context = useMarket(); const { store, setStore, setFilter, confirm, resetNavigation } = context; const account = useAccount();
  function personal(page: Page, id: string): void { if (store.session) flow.push(screen(page, id)); else flow.push(screen("login", page)); }
  const statusIcons = [Clock, Package, Truck, SealCheck, XCircle];
  return <div className="page-pad"><div className="profile"><div className="avatar"><UserCircle size={49} weight="light" /></div><div>{account ? <><h1>你好，鲜邻</h1><p data-testid="profile-phone">{account.phone.slice(0, 3)} **** {account.phone.slice(-4)}</p><span className="demo-label">演示用户{account.phone.endsWith("1") ? " A" : " B"}</span></> : <><h1>好好吃饭，从这里开始</h1><p>登录后查看订单和地址</p><button className="text-link" data-testid="mine-login" onClick={() => personal("mine", "")}>登录演示账号<ArrowRight size={16} /></button></>}</div></div><div className="section-heading"><h2>我的订单</h2><button className="text-link" data-testid="mine-orders" onClick={() => { setFilter("全部"); personal("orders", ""); }}>全部订单<CaretRight size={15} /></button></div><div className="order-shortcuts">{statuses.slice(1).map((status, i) => { const Icon = statusIcons[i]; return <button data-testid={`order-status-${status}`} key={status} onClick={() => { setFilter(status); personal("orders", ""); }}><Icon size={26} weight="light" /><span>{status}</span></button>; })}</div><button className="menu-row" data-testid="mine-addresses" onClick={() => personal("addresses", "manage")}><MapPin size={23} /><span>收货地址<small>保存常用地址，下次更方便</small></span><CaretRight size={19} /></button><button className="menu-row" data-testid="mine-delivery" onClick={() => flow.push(screen("delivery", ""))}><Truck size={23} /><span>配送范围<small>杭州市西湖区全区 · 免配送费</small></span><CaretRight size={19} /></button><div className="brand-note"><Leaf size={28} weight="light" /><h2>把日常，过得新鲜一点</h2><p>这是鲜邻的演示空间。<br />不收款、不发货，请勿填写真实个人资料。</p><div className="retention"><Clock size={16} /><span>本机保留7天<br />本轮到期：{expiryLabel(store.started + duration)}</span></div></div>{account && <button className="logout" data-testid="logout" onClick={() => confirm({ title: "退出演示账号？", detail: "账号的购物车、地址和订单会保留至本轮到期。退出后可切换另一演示身份。", label: "退出登录", run: () => { setStore((s) => ({ ...s, session: null, visitor: [] })); context.setSelectedAddress(""); context.setNote(""); resetNavigation(); } })}><SignOut size={19} />退出登录</button>}</div>;
}

function Login({ target }: { target: string }): ReactNode {
  const context = useMarket(); const { store, setStore, notify } = context; const flow = useFlow();
  const [phone, setPhone] = useState(""); const [code, setCode] = useState(""); const [error, setError] = useState("");
  function login(): void {
    if (phone !== "13800000001" && phone !== "13800000002") { setError("请使用下方提供的演示手机号"); return; }
    if (code !== "246810") { setError("演示验证码错误，请填写246810"); return; }
    const profile = accountFor(store, phone); const merged = mergeCart(store.visitor, profile);
    const changed = store.visitor.some((item) => { const line = merged.find((c) => c.productId === item.productId); return item.selected && (line?.quantity !== item.quantity || !line?.selected || item.quantity > availableStock(productById(item.productId), profile)); });
    const switched = store.session !== null && store.session !== phone;
    setStore((s) => ({ ...replaceAccount(s, { ...accountFor(s, phone), cart: merged }), session: phone, visitor: [] }));
    context.setSelectedAddress(profile.addresses.find((item) => item.isDefault)?.id ?? "");
    if (switched) context.setNote("");
    notify(changed ? "购物车已更新，请重新核对" : "登录成功，欢迎来到鲜邻");
    const destination: Page = changed || switched ? "cart" : target === "checkout" ? "checkout" : target === "orders" ? "orders" : target === "addresses" ? "addresses" : "mine";
    flow.replace(screen(destination, destination === "addresses" ? "manage" : ""));
  }
  return <div className="page-pad"><SectionTitle eyebrow="WELCOME TO XIANLIN" title="鲜邻，很高兴见到你" detail="选好食材，也留一点时间好好生活。" /><div className="login-illustration"><Leaf size={47} weight="light" /><span>日常的鲜，刚刚好</span></div><form onSubmit={(e) => { e.preventDefault(); login(); }}><label className="field-label" htmlFor="phone">演示手机号</label><KeyboardInput id="phone" data-testid="login-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="field-input" placeholder="选择下方演示账号或输入号码" /><label className="field-label" htmlFor="code">演示验证码</label><KeyboardInput id="code" data-testid="login-code" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} className="field-input" placeholder="输入公开演示验证码" maxLength={6} />{error && <p className="field-error" role="alert">{error}</p>}<button className="primary full" data-testid="login-submit" type="submit">登录并继续<ArrowRight size={18} /></button></form><div className="demo-accounts"><span className="eyebrow">选一个演示身份</span><p>无需接收短信，点击填入公开凭据。</p>{(["13800000001", "13800000002"] as Phone[]).map((number, index) => <button data-testid={`demo-account-${index + 1}`} key={number} onClick={() => { setPhone(number); setCode("246810"); setError(""); }}><UserCircle size={24} /><span>演示用户{index === 0 ? "A" : "B"}<small>{number}</small></span><span className="code-chip">246810</span></button>)}</div><p className="privacy-note">仅供演示，不验证号码归属，不发送真实短信。<br />数据仅在当前设备保留7天。<br />本轮到期：{expiryLabel(store.started + duration)}</p></div>;
}

function Addresses({ intent }: { intent: string }): ReactNode {
  const account = useAccount(); const { setStore, selectedAddress, setSelectedAddress, confirm, notify } = useMarket(); const flow = useFlow(); if (!account) return null;
  return <div className="page-pad"><SectionTitle eyebrow={intent === "select" ? "DELIVER TO" : "YOUR ADDRESSES"} title={intent === "select" ? "这一篮，送到哪里？" : "熟悉的地址，安心的日常"} detail="仅杭州市西湖区支持演示下单。" />{account.addresses.length === 0 ? <Empty icon={<MapPin size={48} weight="light" />} title="还没有收货地址" detail="添加一个虚构地址，体验完整的下单流程。" action="添加地址" onAction={() => flow.push(screen("address-edit", ""))} /> : [...account.addresses].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)).map((address) => <article className={`address-card ${selectedAddress === address.id ? "is-selected" : ""}`} key={address.id}><button data-testid={`address-select-${address.id}`} className="address-main" onClick={() => { if (intent !== "select") { flow.push(screen("address-edit", address.id)); return; } if (address.district !== "西湖区") { notify("该地址超出配送范围，请选择或新增西湖区地址"); return; } setSelectedAddress(address.id); flow.pop(); }}><AddressSummary address={address} />{address.district === "上城区" ? <span className="out-of-range"><WarningCircle size={14} />超出配送范围 · 可保存，不可下单</span> : <span className="in-range">可用于演示下单</span>}</button><div className="address-actions"><button data-testid={`address-default-${address.id}`} onClick={() => setStore((s) => { const a = accountFor(s, account.phone); return replaceAccount(s, { ...a, addresses: a.addresses.map((item) => ({ ...item, isDefault: item.id === address.id })) }); })}><span className={`check-box ${address.isDefault ? "checked" : ""}`}>{address.isDefault && <Check size={12} />}</span>{address.isDefault ? "默认地址" : "设为默认"}</button><button data-testid={`address-edit-${address.id}`} onClick={() => flow.push(screen("address-edit", address.id))}><PencilSimple size={15} />编辑</button><button data-testid={`address-delete-${address.id}`} onClick={() => confirm({ title: "删除这个地址？", detail: "历史订单不受影响。删除默认地址后，需要重新设置默认地址。", label: "确认删除", run: () => { setStore((s) => { const a = accountFor(s, account.phone); return replaceAccount(s, { ...a, addresses: a.addresses.filter((item) => item.id !== address.id) }); }); if (selectedAddress === address.id) setSelectedAddress(""); } })}><Trash size={15} />删除</button></div></article>)}</div>;
}

function AddressEdit({ id }: { id: string }): ReactNode {
  const account = useAccount(); const { setStore, setSelectedAddress, notify, confirm } = useMarket(); const flow = useFlow(); const existing = account?.addresses.find((a) => a.id === id);
  const [name, setName] = useState(existing?.name ?? ""); const [phone, setPhone] = useState(existing?.phone ?? ""); const [district, setDistrict] = useState<"西湖区" | "上城区">(existing?.district ?? "西湖区"); const [detail, setDetail] = useState(existing?.detail ?? ""); const [isDefault, setDefault] = useState(existing?.isDefault ?? false); const [error, setError] = useState("");
  function save(): void {
    if (!account) return;
    if (!name.trim()) { setError("请填写收货人姓名"); return; }
    if (!/^1\d{10}$/.test(phone)) { setError("请填写11位联系电话"); return; }
    if (detail.trim().length < 5) { setError("请补充街道、小区及门牌号，至少5个字"); return; }
    const address: Address = { id: id || `address-${Date.now()}`, name: name.trim(), phone, district, detail: detail.trim(), isDefault: isDefault || account.addresses.length === 0 };
    setStore((s) => { const profile = accountFor(s, account.phone); const rest = profile.addresses.filter((a) => a.id !== address.id).map((a) => address.isDefault ? { ...a, isDefault: false } : a); return replaceAccount(s, { ...profile, addresses: [...rest, address] }); });
    if (flow.stack.some((entry) => entry.id === "checkout:") && district === "西湖区") setSelectedAddress(address.id);
    notify(district === "上城区" ? "地址已保存，但不能用于演示下单" : "收货地址已保存"); flow.pop();
  }
  return <div className="page-pad"><SectionTitle eyebrow="A PLACE FOR FRESHNESS" title={id ? "更新这个熟悉的地方" : "添一个收货的地方"} detail="演示请使用虚构资料，不填写真实个人信息。" /><button className="example-fill" data-testid="fill-address" onClick={() => { setName("演示用户"); setPhone("13800000001"); setDistrict("西湖区"); setDetail("演示路1号演示小区1幢101室（虚构）"); }}>使用范围内示例地址<ArrowRight size={17} /></button><form onSubmit={(e) => { e.preventDefault(); save(); }}><label className="field-label" htmlFor="address-name">收货人</label><KeyboardInput id="address-name" data-testid="address-name" className="field-input" placeholder="请输入收货人姓名" value={name} onChange={(e) => setName(e.target.value)} /><label className="field-label" htmlFor="address-phone">联系电话</label><KeyboardInput id="address-phone" data-testid="address-phone" className="field-input" placeholder="11位演示手机号码" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /><label className="field-label" htmlFor="address-district">所在地区</label><div className="region-fields"><span>浙江省 / 杭州市</span><select id="address-district" data-testid="address-district" value={district} onChange={(e) => setDistrict(e.target.value === "西湖区" ? "西湖区" : "上城区")}><option>西湖区</option><option>上城区</option></select></div>{district === "上城区" && <p className="field-error">超出配送范围，可以保存，但不可用于下单。</p>}<label className="field-label" htmlFor="address-detail">详细地址</label><KeyboardTextarea id="address-detail" data-testid="address-detail" className="field-input address-textarea" placeholder="街道、小区、楼栋及门牌号" value={detail} onChange={(e) => setDetail(e.target.value)} /><button type="button" data-testid="default-toggle" className="default-toggle" aria-pressed={isDefault} onClick={() => setDefault(!isDefault)}><span>设为默认地址<small>下次下单，优先使用此地址</small></span><span className={`check-box ${isDefault ? "checked" : ""}`}>{isDefault && <Check size={14} />}</span></button>{error && <p role="alert" className="field-error">{error}</p>}<button type="submit" data-testid="save-address" className="primary full">保存地址<Check size={18} /></button><button type="button" className="text-link form-cancel" data-testid="discard-address" onClick={() => confirm({ title: "放弃本次修改？", detail: "尚未保存的地址内容将丢失。", label: "放弃修改", run: () => flow.pop() })}>放弃编辑</button></form></div>;
}

function Delivery(): ReactNode { const flow = useFlow(); return <div className="page-pad"><SectionTitle eyebrow="FRESH, CLOSE TO HOME" title="新鲜，就在邻里之间" detail="这里是鲜邻的演示配送范围。" /><div className="delivery-art"><Truck size={70} weight="light" /><span>杭州 · 西湖区</span></div><div className="coverage-heading"><CheckCircle size={23} weight="fill" /><h2>西湖区全区</h2><span>¥0.00 配送费</span></div><p className="description-text">浙江省 · 杭州市 · 西湖区<br />区内不另设街道排除项。其他省、市、区县暂不支持演示下单。</p><div className="example-address"><span className="eyebrow">范围内 · 可下单</span><p>杭州市西湖区<br />演示路1号演示小区1幢101室（虚构）</p></div><div className="example-address outside"><span className="eyebrow">范围外 · 不可下单</span><p>杭州市上城区<br />演示路2号演示小区2幢202室（虚构）</p></div><div className="notice-panel"><Info size={21} /><p>仅为产品演示<span>不提供实际配送，不承诺送达时间。超区地址可保存，但不能用于下单。</span></p></div><button className="primary full" data-testid="delivery-return" onClick={() => flow.pop()}>我知道了<Check size={18} /></button></div>; }

function OrderLines({ order }: { order: Order }): ReactNode { return <>{order.lines.map((line) => <div className="order-line" key={line.productId}><img className="order-photo" src={`/assets/products/${line.image}`} alt={line.name} /><div className="grow"><h3>{line.name}</h3><p>{line.spec}<span>×{line.quantity}</span></p></div><strong>{money(line.price * line.quantity)}</strong></div>)}</>; }
function resolveOrder(store: Store, id: string): Order | undefined { return (store.session ? accountFor(store, store.session).orders : []).find((order) => order.id === id) ?? sampleOrders(store.started).find((order) => order.id === id); }
function Success({ id }: { id: string }): ReactNode { const { store, setFilter } = useMarket(); const flow = useFlow(); const order = resolveOrder(store, id); if (!order) return <Empty icon={<Receipt size={48} />} title="订单无法查看" detail="请返回订单列表查看当前身份的订单。" action="查看订单" onAction={() => flow.replace(screen("orders", ""))} />; return <div className="page-pad"><div className="success-intro"><CheckCircle size={76} weight="light" /><span className="eyebrow">ALL SET</span><h1>这一篮新鲜，已记下</h1><p>演示订单提交成功<br />不会收款，也不会实际配送。</p><span className="status-chip">待确认 · 演示订单</span></div><div className="receipt-summary"><div><span>订单编号</span><strong>{order.id}</strong></div><div><span>下单时间</span><strong>{dateLabel(order.created)}</strong></div><div><span>订单总额</span><Price value={orderTotal(order)} /></div></div><div className="success-address"><MapPin size={21} /><div><AddressSummary address={order.address} /></div></div><button data-testid="success-order" className="primary full" onClick={() => { setFilter("全部"); flow.replace(screen("order", order.id)); }}>查看订单<ArrowRight size={18} /></button><button data-testid="success-home" className="secondary full" onClick={() => flow.replace(screen("home", ""))}>继续选购</button></div>; }

function Orders(): ReactNode {
  const { store, filter, setFilter } = useMarket(); const account = useAccount(); const flow = useFlow(); if (!account) return null;
  const personal = account.orders.filter((o) => filter === "全部" || o.status === filter); const samples = sampleOrders(store.started).filter((o) => filter === "全部" || o.status === filter);
  function card(order: Order): ReactNode { return <button className="order-card" data-testid={`order-${order.id}`} key={order.id} onClick={() => flow.push(screen("order", order.id))}><div className="row-between"><span className="muted">{order.sample ? order.id : dateLabel(order.created)}</span><span className={`status-chip ${order.status === "已取消" ? "cancelled" : ""}`}>{order.status}</span></div><div className="order-preview">{order.lines.slice(0, 2).map((line) => <img key={line.productId} src={`/assets/products/${line.image}`} alt={line.name} />)}<div><h3>{order.lines[0]?.name}</h3><p>{order.lines.length > 1 ? `等${order.lines.length}种食材` : "日常新鲜选"}</p></div><CaretRight size={18} /></div><div className="order-card-bottom"><span>{order.sample ? "只读示例，非你的订单" : `共${order.lines.reduce((sum, line) => sum + line.quantity, 0)}件商品`}</span><strong>总额 {money(orderTotal(order))}</strong></div></button>; }
  return <><Carousel ariaLabel="订单状态" className="category-rail" contentClassName="category-track">{statuses.map((status) => <button key={status} data-testid={`filter-${status}`} className={filter === status ? "selected" : ""} onClick={() => setFilter(status)}>{status}</button>)}</Carousel><div className="page-pad"><div className="section-heading"><h2>我的演示订单</h2><span>{personal.length}笔</span></div>{personal.length ? personal.map(card) : <div className="small-empty"><Receipt size={31} weight="light" /><h3>{account.orders.length ? "暂无该状态的个人订单" : "你还没有提交演示订单"}</h3><button className="text-link" data-testid="orders-go-shop" onClick={() => flow.replace(screen("home", ""))}>去逛逛<ArrowRight size={15} /></button></div>}{samples.length > 0 && <><div className="section-heading sample-heading"><h2>看看订单的其他状态</h2><span>只读示例</span></div><p className="muted section-caption">以下是虚构示例，不代表你的购买记录。</p>{samples.map(card)}</>}</div></>;
}

function OrderDetail({ id }: { id: string }): ReactNode {
  const { store } = useMarket(); const flow = useFlow(); const order = resolveOrder(store, id);
  if (!order) return <Empty icon={<WarningCircle size={48} />} title="订单无法查看" detail="该订单不属于当前身份，或已随演示到期清理。" action="返回订单列表" onAction={() => flow.replace(screen("orders", ""))} />;
  const StatusIcon = order.status === "已取消" ? XCircle : order.status === "已完成" ? SealCheck : order.status === "配送中" ? Truck : Clock;
  return <div className="page-pad">{order.sample && <div className="sample-banner"><Info size={18} />只读示例，非你的订单</div>}<div className="order-state"><StatusIcon size={48} weight="light" /><div><h1 data-testid="detail-order-status">{order.status}</h1><p>{order.status === "待确认" ? "已生成演示订单，可查看或取消" : "模拟进度，不代表真实履约"}</p></div></div>{order.reason && <div className="notice-panel"><Info size={18} /><p>{order.reason}</p></div>}<div className="detail-address"><MapPin size={22} /><div><AddressSummary address={order.address} /></div></div><div className="section-heading"><h2>这一单的好食材</h2></div><OrderLines order={order} /><div className="amounts"><div><span>商品总额</span><strong>{money(orderTotal(order))}</strong></div><div><span>配送费</span><strong>¥0.00</strong></div><div className="amount-total"><span>订单总额</span><Price value={orderTotal(order)} /></div></div><dl className="facts"><div><dt>订单编号</dt><dd>{order.id}</dd></div><div><dt>下单时间</dt><dd>{dateLabel(order.created)}</dd></div><div><dt>订单备注</dt><dd>{order.note || "未填写"}</dd></div></dl><p className="privacy-note">仅供演示 · 不收款 · 不产生实际配送</p></div>;
}

function PageView({ route }: { route: Route }): ReactNode {
  const context = useMarket(); const flow = useFlow();
  useEffect(() => { if (route.page === "catalog" && route.id === "reset") { context.setCategory("全部"); context.setQuery(""); } }, [route.page, route.id]);
  const privatePage = ["checkout", "addresses", "address-edit", "orders", "order", "success"].includes(route.page);
  let content: ReactNode;
  if (privatePage && !context.store.session) content = <Empty icon={<UserCircle size={48} />} title="先登录，再继续" detail="使用公开演示身份，查看自己的订单与地址。" action="登录演示账号" onAction={() => flow.replace(screen("login", route.page))} />;
  else switch (route.page) {
    case "home": content = <Home />; break;
    case "catalog": content = <Catalog />; break;
    case "product": content = <ProductPage id={route.id} />; break;
    case "cart": content = <Cart />; break;
    case "checkout": content = <Checkout />; break;
    case "mine": content = <Mine />; break;
    case "login": content = <Login target={route.id} />; break;
    case "addresses": content = <Addresses intent={route.id} />; break;
    case "address-edit": content = <AddressEdit id={route.id} />; break;
    case "delivery": content = <Delivery />; break;
    case "success": content = <Success id={route.id} />; break;
    case "orders": content = <Orders />; break;
    case "order": content = <OrderDetail id={route.id} />; break;
  }
  return <MobileScroll className="market-scroll"><main className={`market-page page-${route.page}`} data-testid={`page-${route.page}`}>{content}</main></MobileScroll>;
}

export default function Prototype(): ReactNode {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  const [store, setStore] = useState<Store>(loadStore); const [message, setMessage] = useState(""); const [selectedAddress, setSelectedAddress] = useState(""); const [note, setNote] = useState(""); const [quantity, setQuantity] = useState(1); const [category, setCategory] = useState("全部"); const [query, setQuery] = useState(""); const [sort, setSort] = useState("默认排序"); const [filter, setFilter] = useState<OrderStatus>("全部"); const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null); const [epoch, setEpoch] = useState(0); const [now, setNow] = useState(Date.now());
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(store)); }, [store]);
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(""), 2600); return () => clearTimeout(timer); }, [message]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(timer); }, []);
  const expired = now >= store.started + duration;
  const value: MarketContext = { store, setStore, notify: setMessage, selectedAddress, setSelectedAddress, note, setNote, quantity, setQuantity, category, setCategory, query, setQuery, sort, setSort, filter, setFilter, confirm: setConfirmation, resetNavigation: () => setEpoch((n) => n + 1) };
  return <Context.Provider value={value}><div className="market-shell"><FlowStack key={epoch} initial={screen("home", "")} />{message && <div className="toast" role="status"><CheckCircle size={18} />{message}</div>}<BottomSheet open={confirmation !== null && !expired} onOpenChange={(open) => { if (!open) setConfirmation(null); }} title={confirmation?.title ?? "确认操作"} description={confirmation?.detail ?? ""} snap={0.36}><div className="confirm-actions"><button className="primary full" data-testid="confirm-action" onClick={() => { confirmation?.run(); setConfirmation(null); }}>{confirmation?.label}</button><button className="secondary full" data-testid="dismiss-action" onClick={() => setConfirmation(null)}>再想想</button></div></BottomSheet>{ready && <BottomSheet open={expired} onOpenChange={() => {}} title="本轮演示已到期" description="购物车、地址、个人订单及未提交内容将清空。商品和只读示例保留，演示库存恢复初始值。" snap={0.45}><div className="confirm-actions"><p className="muted">每轮演示仅在当前设备保留7天。</p><button className="primary full" data-testid="restart-demo" onClick={() => { const time = Date.now(); setStore(initialStore(time)); setNow(time); setSelectedAddress(""); setNote(""); setConfirmation(null); setEpoch((n) => n + 1); }}>开始新一轮演示<ArrowRight size={18} /></button></div></BottomSheet>}</div></Context.Provider>;
}
