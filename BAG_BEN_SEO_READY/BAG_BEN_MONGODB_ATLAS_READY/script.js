const PHONE="03217342487";
const IMAGES=["WhatsApp Image 2025-05-09 at 00.11.02_4efe1dc3.jpg", "WhatsApp Image 2025-05-09 at 00.11.02_ad66473f.jpg", "WhatsApp Image 2025-05-09 at 00.11.00_058a913d.jpg", "WhatsApp Image 2025-05-09 at 00.11.03_e3ccb726.jpg", "WhatsApp Image 2025-05-09 at 00.10.58_53ce0e49.jpg", "WhatsApp Image 2025-05-09 at 00.11.03_dfa8db88.jpg", "image_ef14c091.png", "WhatsApp Image 2025-05-09 at 00.11.02_12993c9f.jpg"];
const names=["Classic Statement Bag","Elegant Shoulder Bag","Everyday Fashion Bag","Chic Carry Bag","Premium Style Bag","Modern Mini Bag","Daily Essential Bag","Featured Fashion Bag"];
const descriptions=[
"An attractive everyday bag with a polished look. Great for shopping, casual outings and daily essentials.",
"A clean and versatile shoulder bag designed to add a refined touch to your everyday style.",
"A practical, fashion-forward bag with a versatile shape for daily use and easy styling.",
"A statement piece for customers who want an attractive bag that works from day to evening.",
"A premium-looking choice for gifting, events and everyday fashion.",
"Compact, stylish and easy to pair with different looks. Great for lightweight essentials.",
"A versatile design for customers who want style and practical everyday storage.",
"A standout BAG BEN design with a modern aesthetic, suitable for gifting and special occasions."
];
const prices=[1000,1000,1000,1200,1400,900,1100,1500];
let products=IMAGES.map((img,i)=>({id:"p"+i,img,name:names[i]||("BAG BEN Bag "+(i+1)),desc:descriptions[i]||"A stylish BAG BEN product from our collection.",price:prices[i]||1000,rating:4.2+(i%5)*.15,category:["Shoulder","Everyday","Fashion","Statement"][i%4]}));
let cart=JSON.parse(localStorage.getItem("bb_cart")||"[]");
let wishlist=JSON.parse(localStorage.getItem("bb_wish")||"[]");
let ratings=JSON.parse(localStorage.getItem("bb_ratings")||"{}");
let activeCategory="All", activePrice="all", current=null;
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function save(){localStorage.setItem("bb_cart",JSON.stringify(cart));localStorage.setItem("bb_wish",JSON.stringify(wishlist));localStorage.setItem("bb_ratings",JSON.stringify(ratings))}
function stars(n){return "★★★★★".split("").map((_,i)=>i<Math.round(n)?"★":"☆").join("")}
async function loadProductsFromBackend(){
  try{
    const response = await fetch("/api/products", {cache:"no-store"});
    if(!response.ok) throw new Error("Could not load products");
    const backendProducts = await response.json();

    // Backend is the source of truth once it contains products.
    // The server package includes the original BAG BEN products, so
    // products added/edited/deleted in Admin are reflected here.
    if(Array.isArray(backendProducts)){
      products = backendProducts.map(p => ({
        id:p.id,
        img:p.image || p.img || "",
        name:p.name || "BAG BEN Bag",
        desc:p.description || p.desc || "",
        price:Number(p.price)||0,
        rating:Number(p.rating)||5,
        category:p.category || "Fashion",
        stock:Math.max(0, Number(p.stock ?? 0))
      }));
    }
  }catch(err){
    console.warn("BAG BEN backend products could not be loaded:", err);
  }

  $("#heroImage").src=products[0]?.img || IMAGES[0] || "";
  $("#categoryBar").innerHTML=["All",...new Set(products.map(p=>p.category))].map(c=>`<button class="cat ${c==="All"?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  render();
}
function render(){
  const q = $("#search").value.toLowerCase().trim();
  const sort = $("#sort").value;

  let list = products.filter(p => {
    const searchable = (p.name + " " + p.desc + " " + p.category + " " + p.price).toLowerCase();
    const matchesSearch = searchable.includes(q);
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesPrice =
      activePrice === "all" ||
      (activePrice === "low" && p.price <= 1000) ||
      (activePrice === "mid" && p.price > 1000 && p.price <= 1300) ||
      (activePrice === "high" && p.price > 1300);
    return matchesSearch && matchesCategory && matchesPrice;
  });

  if(sort === "low") list.sort((a,b) => a.price - b.price);
  if(sort === "high") list.sort((a,b) => b.price - a.price);
  if(sort === "rating") list.sort((a,b) => b.rating - a.rating);

  $("#products").innerHTML = list.length ? list.map(p => `
    <article class="product-card">
      <div class="product-image" data-open="${p.id}">
        <img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">
        <button class="wish" data-wish="${p.id}" title="Wishlist">${wishlist.includes(p.id) ? "♥" : "♡"}</button>
      </div>
      <div class="product-info">
        <h3>${esc(p.name)}</h3>
        <div class="rating">${stars(ratings[p.id] || p.rating)} <span>(${(ratings[p.id] || p.rating).toFixed(1)})</span></div>
        <div class="product-foot">
          <div><div class="price">Rs. ${p.price.toLocaleString()}</div><div class="stock-label ${p.stock>0?"in-stock":"out-stock"}">${p.stock>0?`In stock: ${p.stock}`:"Out of stock"}</div></div>
          <button class="small-btn" data-open="${p.id}">View bag</button>
        </div>
      </div>
    </article>`).join("") : `<div class="empty">No bags found. Try another search or price range.</div>`;

  $("#wishCount").textContent = wishlist.length;
  $("#cartCount").textContent = cart.reduce((a,x) => a + x.qty, 0);
}
function openProduct(id){
 current=products.find(p=>p.id===id); if(!current)return;
 $("#modalImg").src=current.img; $("#modalImg").alt=current.name; $("#modalName").textContent=current.name; $("#modalPrice").textContent="Rs. "+current.price.toLocaleString();
 $("#modalDesc").textContent=current.desc;
 $("#modalStock").textContent=current.stock>0?`In stock: ${current.stock}`:"Out of stock";
 $("#addCart").disabled=current.stock<=0; $("#modalRating").textContent=stars(ratings[id]||current.rating)+" · "+(ratings[id]||current.rating).toFixed(1);
 $("#ratingStars").innerHTML='<div class="rating-stars">'+[1,2,3,4,5].map(n=>`<button data-rate="${n}">${n<=Math.round(ratings[id]||0)?"★":"☆"}</button>`).join("")+'</div>';
 $("#addWish").textContent=wishlist.includes(id)?"♥ Saved":"♡ Wishlist";
 $("#productModal").classList.add("show"); document.body.style.overflow="hidden";
}
function closeModal(){$("#productModal").classList.remove("show");document.body.style.overflow=""}
function renderDrawer(){
 $("#drawerTitle").textContent=$("#wishBtn").dataset.mode==="wish"?"Wishlist":"Your Cart";
 if($("#wishBtn").dataset.mode==="wish"){
  const list=products.filter(p=>wishlist.includes(p.id));
  $("#drawerBody").innerHTML=list.length?list.map(p=>`<div class="drawer-item"><img src="${esc(p.img)}"><div><strong>${esc(p.name)}</strong><div>Rs. ${p.price.toLocaleString()}</div><button class="small-btn" data-open="${p.id}">View</button></div></div>`).join(""):'<div class="drawer-empty">Your wishlist is empty.</div>';
 }else{
  const items=cart.map(x=>({...products.find(p=>p.id===x.id),qty:x.qty})).filter(Boolean);
  $("#drawerBody").innerHTML=items.length?items.map(p=>`<div class="drawer-item"><img src="${esc(p.img)}"><div><strong>${esc(p.name)}</strong><div>Rs. ${(p.price*p.qty).toLocaleString()} · Qty ${p.qty}</div><button class="small-btn" data-remove="${p.id}">Remove</button></div></div>`).join("")+`<div class="drawer-total">Total: Rs. ${items.reduce((a,p)=>a+p.price*p.qty,0).toLocaleString()}</div><a class="btn primary" href="tel:${PHONE}">Call to order: ${PHONE}</a>`:'<div class="drawer-empty">Your cart is empty.</div>';
 }
 $("#overlay").classList.add("show");$("#drawer").classList.add("show");
}
function closeDrawer(){$("#overlay").classList.remove("show");$("#drawer").classList.remove("show")}
$("#search").addEventListener("input", render);
loadProductsFromBackend();
$("#sort").addEventListener("change", render);

$("#priceFilter").addEventListener("change", e => {
  activePrice = e.target.value;
  document.querySelectorAll(".price-chip").forEach(x => x.classList.toggle("active", x.dataset.priceSort === activePrice));
  render();
});

document.querySelectorAll(".price-chip").forEach(btn => {
  btn.addEventListener("click", () => {
    activePrice = btn.dataset.priceSort;
    $("#priceFilter").value = activePrice;
    $("#sort").value = activePrice === "all" ? "featured" : activePrice;
    document.querySelectorAll(".price-chip").forEach(x => x.classList.toggle("active", x === btn));
    render();
  });
});

$("#categoryBar").addEventListener("click", e => {
  if(!e.target.dataset.cat) return;
  activeCategory = e.target.dataset.cat;
  document.querySelectorAll(".cat").forEach(x => x.classList.toggle("active", x === e.target));
  render();
});

document.addEventListener("click",e=>{
 const open=e.target.closest("[data-open]"), wish=e.target.closest("[data-wish]"), remove=e.target.closest("[data-remove]"), rate=e.target.closest("[data-rate]");
 if(open){openProduct(open.dataset.open);return}
 if(wish){const id=wish.dataset.wish;wishlist=wishlist.includes(id)?wishlist.filter(x=>x!==id):[...wishlist,id];save();render();return}
 if(remove){cart=cart.filter(x=>x.id!==remove.dataset.remove);save();render();renderDrawer();return}
 if(rate&&current){ratings[current.id]=Number(rate.dataset.rate);save();openProduct(current.id);render()}
});
$("#closeModal").onclick=closeModal;
document.addEventListener("keydown",e=>{if(e.key==="Escape" && $("#productModal").classList.contains("show")) closeModal();});
$("#productModal").addEventListener("click",e=>{if(e.target.id==="productModal")closeModal()});
$("#addCart").onclick=()=>{if(!current || current.stock<=0)return;let x=cart.find(a=>a.id===current.id);x?x.qty++:cart.push({id:current.id,qty:1});save();render();closeModal();$("#wishBtn").dataset.mode="cart";renderDrawer()};
$("#addWish").onclick=()=>{if(!current)return;wishlist=wishlist.includes(current.id)?wishlist.filter(x=>x!==current.id):[...wishlist,current.id];save();render();openProduct(current.id)};
$("#cartBtn").onclick=()=>{$("#wishBtn").dataset.mode="cart";renderDrawer()};
$("#wishBtn").onclick=()=>{$("#wishBtn").dataset.mode="wish";renderDrawer()};
$("#closeDrawer").onclick=closeDrawer;$("#overlay").onclick=closeDrawer;
$("#menuBtn").onclick=()=>$("#mobileNav").classList.toggle("open");
$("#viewFeatured").onclick=()=>{document.querySelector("#shop").scrollIntoView({behavior:"smooth"});$("#sort").value="rating";render()};
let themes=["","theme-rose","theme-night","theme-sage"],ti=0;
$("#themeBtn").onclick=()=>{document.body.classList.remove(...themes.filter(Boolean));ti=(ti+1)%themes.length;if(themes[ti])document.body.classList.add(themes[ti]);localStorage.setItem("bb_theme",themes[ti])};
const savedTheme=localStorage.getItem("bb_theme");if(savedTheme){document.body.classList.add(savedTheme);ti=Math.max(0,themes.indexOf(savedTheme))}


/* BAG BEN Assistant — local FAQ chatbot, no external API required */
const chatLauncher = document.getElementById("chatLauncher");
const chatbot = document.getElementById("chatbot");
const chatClose = document.getElementById("chatClose");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const quickReplies = document.getElementById("quickReplies");

function addChatMessage(text, who="bot"){
  const div=document.createElement("div");
  div.className=who==="user"?"user-msg":"bot-msg";
  div.textContent=text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop=chatMessages.scrollHeight;
}

function assistantReply(raw){
  const q=raw.toLowerCase().trim();

  if(q.includes("delivery") || q.includes("contact") || q.includes("phone") || q.includes("number"))
    return `For delivery and order questions, call ${PHONE}. We’ll help you with the delivery details.`;

  if(q.includes("order") || q.includes("buy") || q.includes("purchase"))
    return `To order, open a bag, read its description, add it to your cart, then use the delivery contact ${PHONE} to arrange your order.`;

  if(q.includes("price") || q.includes("cost") || q.includes("cheap"))
    return `You can see the current price directly on every BAG BEN product card. Open a product to see its full details.`;

  if(q.includes("rating") || q.includes("review") || q.includes("star"))
    return `Each product has a rating. Open a bag and choose 1–5 stars under “Your rating”.`;

  if(q.includes("cart"))
    return `Use the Cart button at the top to review items you have added.`;

  if(q.includes("wishlist") || q.includes("favorite"))
    return `Tap the ♡ button on a bag to save it to your wishlist.`;

  if(q.includes("bag") || q.includes("show") || q.includes("collection") || q.includes("product"))
    return `We have ${products.length} bag${products.length===1?"":"s"} in this collection. Scroll to Shop or tap “Show bags” below.`;

  if(q.includes("theme") || q.includes("color") || q.includes("colour"))
    return `Tap the ◐ button in the header to switch the store’s color theme.`;

  if(q.includes("help") || q.includes("what can") || q.includes("hello") || q.includes("hi"))
    return `I can help with bags, prices, delivery, ordering, ratings, cart, wishlist and store features. What would you like to know?`;

  return `I can help with bags, prices, delivery, ordering, ratings, cart and wishlist. Try asking “How do I order a bag?”`;
}

function sendChat(text){
  const clean=text.trim();
  if(!clean)return;
  addChatMessage(clean,"user");
  setTimeout(()=>addChatMessage(assistantReply(clean)),220);
}

chatLauncher.addEventListener("click",()=>{
  chatbot.classList.add("open");
  chatInput.focus();
});
chatClose.addEventListener("click",()=>chatbot.classList.remove("open"));
chatForm.addEventListener("submit",e=>{
  e.preventDefault();
  const text=chatInput.value;
  chatInput.value="";
  sendChat(text);
});
quickReplies.addEventListener("click",e=>{
  if(e.target.dataset.question) sendChat(e.target.dataset.question);
});

const closeModalBottom=document.getElementById("closeModalBottom"); if(closeModalBottom) closeModalBottom.addEventListener("click",closeModal);
