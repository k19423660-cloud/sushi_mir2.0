const $ = s => document.querySelector(s);
let products = [], cart = [], activeFilter = "Усі";
const money = n => `${Number(n).toLocaleString("uk-UA")} ₴`;
const safe = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(path, options={}) {
  const r = await fetch(path,{...options,headers:{"Content-Type":"application/json",...(options.headers||{})}});
  const data = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error || "Не вдалося виконати запит");
  return data;
}
async function loadProducts(){
  try{const d=await api("/api/products");products=d.products||[];renderProducts();}
  catch(e){$("#products").innerHTML=`<p class="empty">Не вдалося завантажити меню. ${safe(e.message)}</p>`;}
}
function renderProducts(){
  const shown=products.filter(p=>activeFilter==="Усі"||p.category===activeFilter||(activeFilter==="Інше"&&!["Роли","Сети","Запечені"].includes(p.category)));
  $("#products").innerHTML=shown.length?shown.map(p=>`<article class="product-card"><div class="product-photo"><img src="${safe(p.image||"https://images.unsplash.com/photo-1579871494447-9811cf80d66a?w=600")}" alt="${safe(p.name)}" loading="lazy"><span class="product-category">${safe(p.category||"SUSHI")}</span></div><div class="product-info"><h3>${safe(p.name)}</h3><p>${safe(p.description||"Смачна позиція з меню Sushi Mir.")}</p><div class="product-meta">${p.weight?`⚖ ${safe(p.weight)} г`:""}</div><div class="product-bottom"><strong class="price">${money(p.price)}</strong><button class="add-btn" data-add="${safe(p.id)}">+ ДОДАТИ</button></div></div></article>`).join(""):'<p class="empty">Поки немає товарів у цій категорії.</p>';
}
$("#filters").addEventListener("click",e=>{const b=e.target.closest("[data-filter]");if(!b)return;activeFilter=b.dataset.filter;document.querySelectorAll(".filter").forEach(x=>x.classList.toggle("active",x===b));renderProducts();});
$("#products").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(!b)return;const p=products.find(x=>x.id===b.dataset.add);if(!p)return;const row=cart.find(x=>x.id===p.id);row?row.qty++:cart.push({...p,qty:1});renderCart();toast("Додано до кошика 🍣");});
function renderCart(){
  const count=cart.reduce((s,x)=>s+x.qty,0),total=cart.reduce((s,x)=>s+x.qty*Number(x.price),0);
  $("#cartCount").textContent=count;$("#cartTotal").textContent=money(total);$("#formTotal").textContent=money(total);
  $("#cartItems").innerHTML=cart.length?cart.map(x=>`<div class="cart-row"><div><strong>${safe(x.name)}</strong><small>${money(x.price)} · ${x.weight?safe(x.weight)+" г":""}</small></div><div class="qty"><button data-dec="${safe(x.id)}">−</button><b>${x.qty}</b><button data-inc="${safe(x.id)}">+</button></div></div>`).join(""):'<p class="empty">Тут поки порожньо 🍣</p>';
}
$("#cartItems").addEventListener("click",e=>{const inc=e.target.closest("[data-inc]"),dec=e.target.closest("[data-dec]");if(inc){const x=cart.find(p=>p.id===inc.dataset.inc);if(x)x.qty++;}if(dec){const x=cart.find(p=>p.id===dec.dataset.dec);if(x){x.qty--;if(x.qty<=0)cart=cart.filter(p=>p.id!==x.id);}}renderCart();});
function openCart(){ $("#cartDrawer").classList.add("open");$("#backdrop").classList.add("show");}
function closeCart(){ $("#cartDrawer").classList.remove("open");$("#backdrop").classList.remove("show");}
$("#cartOpen").onclick=openCart;$("#cartClose").onclick=closeCart;$("#backdrop").onclick=closeCart;
function openCheckout(){if(!cart.length){toast("Спочатку додай щось у кошик 🙂");return;}closeCart();$("#checkoutBackdrop").classList.add("show");}
function closeCheckout(){$("#checkoutBackdrop").classList.remove("show");}
$("#checkoutOpen").onclick=openCheckout;$("#checkoutClose").onclick=closeCheckout;$("#checkoutBackdrop").addEventListener("click",e=>{if(e.target===$("#checkoutBackdrop"))closeCheckout();});
$("#orderForm").addEventListener("submit",async e=>{
 e.preventDefault();if(!cart.length)return;
 const form=e.currentTarget,fd=new FormData(form),btn=$("#submitOrder"),msg=$("#formMessage");
 const order={name:fd.get("name"),phone:fd.get("phone"),telegram:fd.get("telegram"),fulfillment:fd.get("fulfillment"),comment:fd.get("comment"),items:cart.map(x=>({id:x.id,name:x.name,price:x.price,weight:x.weight,qty:x.qty})),total:cart.reduce((s,x)=>s+x.qty*Number(x.price),0)};
 btn.disabled=true;btn.textContent="Надсилаємо...";
 try{await api("/api/order",{method:"POST",body:JSON.stringify(order)});msg.textContent="Замовлення прийнято! Дякуємо ❤️";cart=[];renderCart();form.reset();setTimeout(()=>{closeCheckout();msg.textContent="";},2200);}
 catch(err){msg.textContent=err.message+" Перевір налаштування Telegram у Netlify.";}
 finally{btn.disabled=false;btn.innerHTML='Підтвердити замовлення <span>↗</span>';}
});
function toast(t){const el=$("#toast");el.textContent=t;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),1800);}
renderCart();loadProducts();