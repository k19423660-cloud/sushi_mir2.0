import { getStore } from "@netlify/blobs";

const store = () => getStore("sushi-mir-data");
const json = (data, status=200) => new Response(JSON.stringify(data), {status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
async function getProducts(){const raw=await (await store()).get("products");if(!raw)return [];try{return JSON.parse(raw);}catch{return [];}}
async function saveProducts(products){await (await store()).set("products",JSON.stringify(products));}
function validText(v,max=500){return typeof v==="string"&&v.length<=max;}
export default async (request) => {
  const url=new URL(request.url), path=url.pathname.replace(/^\/api\/?/,"");
  try{
    if(request.method==="GET"&&path==="products") return json({products:await getProducts()});
    if(request.method==="POST"&&path==="products"){
      const body=await request.json();
      if(!validText(body.name,100)||!body.name.trim()||!Number.isFinite(Number(body.price))||Number(body.price)<=0) return json({error:"Перевір назву та ціну товару."},400);
      if(!validText(body.description||"",500)||!validText(body.category||"",30)||!validText(body.image||"",3_000_000))return json({error:"Завелике або некоректне поле."},400);
      if(body.image&&!/^data:image\/(png|jpeg|webp|gif);base64,/.test(body.image))return json({error:"Фото має бути JPG, PNG, WEBP або GIF."},400);
      const products=await getProducts(),id=body.id||crypto.randomUUID(),item={id,name:body.name.trim(),category:body.category||"Роли",description:body.description||"",price:Number(body.price),weight:Number(body.weight)||0,image:body.image||""};
      const i=products.findIndex(p=>p.id===id);if(i>=0)products[i]=item;else products.unshift(item);
      await saveProducts(products);return json({ok:true,product:item});
    }
    if(request.method==="DELETE"&&path==="products"){
      const id=url.searchParams.get("id");if(!id)return json({error:"Не вказано товар."},400);
      const products=(await getProducts()).filter(p=>p.id!==id);await saveProducts(products);return json({ok:true});
    }
    if(request.method==="POST"&&path==="order"){
      const order=await request.json();
      if(!validText(order.name,70)||!order.name.trim()||!validText(order.phone,30)||!order.phone.trim()||!Array.isArray(order.items)||!order.items.length||order.items.length>40)return json({error:"Перевір дані замовлення."},400);
      const token=Netlify.env.get("TELEGRAM_BOT_TOKEN"),chat=Netlify.env.get("TELEGRAM_CHAT_ID");
      if(!token||!chat)return json({error:"Telegram ще не налаштований адміністратором."},503);
      const lines=order.items.map(x=>`• ${String(x.name).slice(0,100)} × ${Math.max(1,Math.min(99,Number(x.qty)||1))} — ${Number(x.price)*Math.max(1,Math.min(99,Number(x.qty)||1))} грн`).join("\n");
      const message=`🍣 <b>НОВЕ ЗАМОВЛЕННЯ — SUSHI MIR</b>\n\n👤 Ім'я: ${escapeHtml(order.name)}\n📞 Телефон: ${escapeHtml(order.phone)}\n${order.telegram?`✈️ Telegram: ${escapeHtml(String(order.telegram).slice(0,50))}\n`:""}🏠 Отримання: ${escapeHtml(order.fulfillment||"Не вказано")}\n\n<b>Замовлення:</b>\n${lines}\n\n💰 <b>Разом: ${Number(order.total)||0} грн</b>\n💬 Коментар: ${escapeHtml(String(order.comment||"—").slice(0,500))}`;
      const tg=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chat,text:message,parse_mode:"HTML"})});
      const result=await tg.json();if(!tg.ok||!result.ok)return json({error:"Telegram не прийняв повідомлення. Перевір токен і Chat ID."},502);
      return json({ok:true});
    }
    return json({error:"Маршрут не знайдено."},404);
  }catch(e){console.error(e);return json({error:"Помилка сервера. Спробуй ще раз."},500);}
};
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
export const config={path:"/api/*"};