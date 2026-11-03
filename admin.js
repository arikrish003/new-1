(() => {
  const $ = (id) => document.getElementById(id);
  const cfg = window.AGT_SUPABASE_CONFIG || {};
  let sb = null, session = null, products = [], variants = [], categories = [];
  const PACK_LABEL = (g) => Number(g) >= 1000 ? `${Number(g)/1000} kg` : `${g} g`;
  const money = (paise) => `₹${(Number(paise || 0)/100).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const escapeHtml = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function toast(msg, bad=false){ const t=$('toast');t.textContent=msg;t.style.background=bad?'#8d2929':'#163e2c';t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3800); }
  function configured(){return cfg.url && cfg.anonKey && /^https:\/\//.test(cfg.url) && !cfg.url.includes('PASTE_') && !cfg.anonKey.includes('PASTE_');}
  function setConnection(ok,msg){$('connectionPill').textContent=ok?'● Supabase connected':'● '+(msg||'Not connected');$('connectionPill').style.background=ok?'#e8f7ed':'#fff3df';$('connectionPill').style.color=ok?'#23794a':'#966514';$('settingsStatus').textContent=ok?'Connected':'Not configured';$('settingsStatus').className='badge '+(ok?'green':'amber');$('configInfo').textContent=msg|| (ok?'Supabase client initialised.':'Edit admin-config.js with your project URL and public key.');}
  function showApp(user){$('loginScreen').classList.add('hidden');$('app').classList.remove('hidden');$('avatar').textContent=(user.email||'AG').slice(0,2).toUpperCase();}
  function showLogin(){ $('app').classList.add('hidden');$('loginScreen').classList.remove('hidden'); }
  function activateSection(name){document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===`section-${name}`));document.querySelectorAll('.navbtn[data-section]').forEach(x=>x.classList.toggle('active',x.dataset.section===name));const names={overview:'Dashboard Overview',products:'Products',pricing:'Pricing & Stock',orders:'Orders',customers:'Customers',payments:'Payments',shipping:'Shipping',settings:'Settings & Connection'};$('pageTitle').textContent=names[name]||name;$('crumbSection').textContent=names[name]||name;$('sidebar').classList.remove('open');if(name==='products')loadProducts();if(name==='pricing')loadVariants();if(name==='orders')loadOrders();}
  async function loadProducts(){if(!sb)return;const body=$('productsBody');body.innerHTML='<tr><td colspan="5" class="muted">Loading…</td></tr>';const {data,error}=await sb.from('products').select('id,name,slug,description,category_id,image_url,is_active,is_featured,created_at').order('name');if(error){body.innerHTML=`<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;return;}products=data||[];renderProducts();$('statProducts').textContent=products.filter(p=>p.is_active).length;}
  function renderProducts(){const q=($('productSearch').value||'').toLowerCase(),f=$('productFilter').value;const rows=products.filter(p=>(`${p.name} ${p.slug}`.toLowerCase().includes(q))&&(f==='all'||(f==='active'?p.is_active:!p.is_active)));$('productsBody').innerHTML=rows.length?rows.map(p=>`<tr><td><div class="product-cell"><img class="product-thumb" src="${escapeHtml(p.image_url||'assets/favicon.png')}" onerror="this.src='assets/favicon.png'" alt=""><div><strong>${escapeHtml(p.name)}</strong><div class="muted">${escapeHtml(p.id.slice(0,8))}…</div></div></div></td><td>${escapeHtml(p.category_id||'—')}</td><td>${escapeHtml(p.slug)}</td><td><span class="badge ${p.is_active?'green':'red'}">${p.is_active?'Active':'Inactive'}</span></td><td><button class="btn small" data-edit-product="${p.id}">Edit</button> <button class="btn small" data-toggle-product="${p.id}">${p.is_active?'Deactivate':'Activate'}</button></td></tr>`).join(''):'<tr><td colspan="5" class="muted">No matching products. Add your first product or adjust the search.</td></tr>';}
  async function loadVariants(){if(!sb)return;const body=$('variantsBody');body.innerHTML='<tr><td colspan="7" class="muted">Loading…</td></tr>';const [pr,vr]=await Promise.all([sb.from('products').select('id,name,is_active'),sb.from('product_variants').select('id,product_id,sku,pack_size_grams,price_paise,stock_quantity,is_active').order('pack_size_grams')]);if(pr.error||vr.error){body.innerHTML=`<tr><td colspan="7">${escapeHtml((pr.error||vr.error).message)}</td></tr>`;return;}products=pr.data||[];variants=vr.data||[];renderVariants();$('statVariants').textContent=variants.length;$('statLowStock').textContent=variants.filter(v=>Number(v.stock_quantity)<=5).length;}
  function renderVariants(){
    const q=($('variantSearch').value||'').toLowerCase(), f=$('stockFilter').value;
    const rows=variants.map(v=>({...v,product:products.find(p=>p.id===v.product_id)})).filter(v=>{
      const matchesText=`${v.product?.name||''} ${v.sku||''} ${v.pack_size_grams}`.toLowerCase().includes(q);
      const stock=Number(v.stock_quantity||0);
      const matchesStock=f==='all'||(f==='low'?stock>0&&stock<=5:f==='out'?stock===0:stock>0);
      return matchesText&&matchesStock;
    });
    $('variantsBody').innerHTML=rows.length?rows.map(v=>`<tr><td><strong>${escapeHtml(v.product?.name||'Unknown product')}</strong></td><td>${PACK_LABEL(v.pack_size_grams)}</td><td>${escapeHtml(v.sku||'—')}</td><td><input aria-label="Price in rupees" data-price="${v.id}" type="number" min="0" step="0.01" value="${(Number(v.price_paise||0)/100).toFixed(2)}" style="width:95px;padding:7px;border:1px solid var(--line);border-radius:7px"></td><td><input aria-label="Stock units" data-stock="${v.id}" type="number" min="0" step="1" value="${Number(v.stock_quantity||0)}" style="width:75px;padding:7px;border:1px solid var(--line);border-radius:7px"></td><td><span class="badge ${Number(v.stock_quantity)>5?'green':Number(v.stock_quantity)>0?'amber':'red'}">${Number(v.stock_quantity)>5?'In stock':Number(v.stock_quantity)>0?'Low stock':'Out of stock'}</span></td><td><button class="btn small primary" data-save-variant="${v.id}">Save</button></td></tr>`).join(''):'<tr><td colspan="7" class="muted">No pack variants found. Add products and variants after setup.</td></tr>';
  }
  async function createVariants(){
    if(!sb)return;
    if(!products.length){await loadProducts();}
    const choices=products.filter(p=>p.is_active);
    if(!choices.length){toast('Create or activate a product first.',true);return;}
    const selected=prompt('Enter the exact product name to create 50g, 100g, 250g, 500g and 1kg variants for\n\n'+choices.map(p=>p.name).join('\n'));
    if(!selected)return;
    const product=choices.find(p=>p.name.toLowerCase()===selected.trim().toLowerCase());
    if(!product){toast('Product name did not match. Copy the exact name and try again.',true);return;}
    const sizes=[50,100,250,500,1000];
    const existing=variants.filter(v=>v.product_id===product.id).map(v=>Number(v.pack_size_grams));
    const missing=sizes.filter(g=>!existing.includes(g));
    if(!missing.length){toast('All five pack sizes already exist for this product.');return;}
    const slug=(product.slug||product.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')).replace(/^-|-$/g,'');
    const rows=missing.map(g=>({product_id:product.id,sku:`${slug}-${g}g`,pack_size_grams:g,price_paise:0,stock_quantity:0,is_active:true}));
    const {error}=await sb.from('product_variants').insert(rows);
    if(error){toast(error.message,true);return;}
    toast(`Created ${missing.length} pack size(s) at ₹0.00 and stock 0. Enter the real prices and stock before publishing.`);
    await loadVariants();renderLowStock();
  }
  async function saveVariant(id){const priceEl=document.querySelector(`[data-price="${id}"]`),stockEl=document.querySelector(`[data-stock="${id}"]`);const price=Number(priceEl.value),stock=Number(stockEl.value);if(!Number.isFinite(price)||price<0||!Number.isInteger(stock)||stock<0){toast('Enter a valid price and whole-number stock quantity.',true);return;}const btn=document.querySelector(`[data-save-variant="${id}"]`);btn.disabled=true;const {error}=await sb.from('product_variants').update({price_paise:Math.round(price*100),stock_quantity:stock,updated_at:new Date().toISOString()}).eq('id',id);btn.disabled=false;if(error){toast(error.message,true);return;}toast('Price and stock saved.');await loadVariants();renderLowStock();}
  const ORDER_STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled'];
  async function updateOrderStatus(orderId, nextStatus, button) {
if (!sb || !ORDER_STATUSES.includes(nextStatus)) {
toast('Invalid order status.', true);
return;
}

if (!confirm(`Change order status to "${nextStatus}"?`)) {
await loadOrders();
return;
}

if (button) button.disabled = true;

try {
const { data, error } = await sb.rpc('admin_update_order_status', {
p_order_id: orderId,
p_next_status: nextStatus
});

```
if (error) {
  toast(`Could not update order: ${error.message}`, true);
  await loadOrders();
  return;
}

toast(data?.message || 'Order status updated.');
await loadOrders();
```

} catch (err) {
toast(`Could not update order: ${err.message}`, true);
await loadOrders();

} finally {
if (button) button.disabled = false;
}
}

  async function loadOrders(){
    const body=$('ordersBody');
    if(!sb){body.innerHTML='<tr><td colspan="6">Supabase not configured.</td></tr>';return;}
    body.innerHTML='<tr><td colspan="6" class="muted">Loading orders…</td></tr>';
    const {data,error}=await sb.from('orders').select('id,order_number,customer_name,customer_email,customer_phone,total_paise,payment_status,payment_method,order_status,created_at').order('created_at',{ascending:false}).limit(100);
    if(error){body.innerHTML=`<tr><td colspan="6" class="muted">Could not read orders: ${escapeHtml(error.message)}. Apply the supplied admin order policies, then refresh.</td></tr>`;$('statOrders').textContent='—';return;}
    const orders=data||[];$('statOrders').textContent=orders.length;
    if(!orders.length){body.innerHTML='<tr><td colspan="6" class="muted">No orders yet.</td></tr>';return;}
    const ids=orders.map(o=>o.id);
    const {data:itemData,error:itemError}=await sb.from('order_items').select('order_id,product_name,pack_size_grams,quantity,unit_price_paise,line_total_paise').in('order_id',ids);
    const itemMap={};(itemData||[]).forEach(it=>{(itemMap[it.order_id] ||= []).push(it)});
    body.innerHTML=orders.map(o=>{
      const items=itemMap[o.id]||[];
      const itemSummary=itemError?'Items unavailable':items.length?items.map(it=>`${escapeHtml(it.product_name)} (${escapeHtml(PACK_LABEL(it.pack_size_grams))}) × ${Number(it.quantity)} — ${money(it.line_total_paise)}`).join('<br>'):'No item rows';
      const status=String(o.order_status||'pending').toLowerCase();
      const options=ORDER_STATUSES.map(st=>`<option value="${st}" ${st===status?'selected':''}>${st[0].toUpperCase()+st.slice(1)}</option>`).join('');
      return `<tr><td><strong>${escapeHtml(o.order_number||String(o.id||'').slice(0,12))}</strong><div class="muted" style="font-size:10px">${escapeHtml(String(o.id||'').slice(0,8))}…</div></td><td><strong>${escapeHtml(o.customer_name||'—')}</strong><div class="muted">${escapeHtml(o.customer_email||'')}</div><div class="muted">${escapeHtml(o.customer_phone||'')}</div><details style="margin-top:6px"><summary style="cursor:pointer;color:#0d5a40">${items.length} item(s)</summary><div style="font-size:12px;line-height:1.8;padding-top:5px">${itemSummary}</div></details></td><td>${money(o.total_paise)}</td><td><span class="badge ${String(o.payment_status)==='paid'?'green':'amber'}">${escapeHtml(o.payment_status||'pending')}</span><div class="muted">${escapeHtml(o.payment_method||'—')}</div></td><td><select aria-label="Order status" data-order-status="${escapeHtml(o.id)}" style="max-width:135px;padding:7px;border:1px solid var(--line);border-radius:7px;background:#fff">${options}</select><button class="btn small primary" data-save-order-status="${escapeHtml(o.id)}" style="margin-top:6px">Save</button></td><td>${escapeHtml(o.created_at?new Date(o.created_at).toLocaleString():'—')}</td></tr>`;
    }).join('');
  }
  function renderLowStock(){const low=variants.map(v=>({...v,product:products.find(p=>p.id===v.product_id)})).filter(v=>Number(v.stock_quantity)<=5).sort((a,b)=>a.stock_quantity-b.stock_quantity).slice(0,8);$('lowStockBody').innerHTML=low.length?low.map(v=>`<tr><td>${escapeHtml(v.product?.name||'Unknown')}</td><td>${PACK_LABEL(v.pack_size_grams)}</td><td>${money(v.price_paise)}</td><td>${v.stock_quantity}</td><td><span class="badge ${Number(v.stock_quantity)===0?'red':'amber'}">${Number(v.stock_quantity)===0?'Out of stock':'Low stock'}</span></td></tr>`).join(''):'<tr><td colspan="5" class="muted">No low-stock variants, or inventory has not been added yet.</td></tr>';const total=variants.length,available=variants.filter(v=>Number(v.stock_quantity)>0).length,empty=$('inventoryChart');empty.innerHTML=`<strong>${available} of ${total} pack variants currently have stock</strong><span>${total?Math.round(available/total*100):0}% available · Data from Supabase</span><div style="width:min(380px,90%);height:9px;background:#e7eee8;border-radius:20px;margin-top:18px;overflow:hidden"><div style="width:${total?available/total*100:0}%;height:100%;background:#18764c;border-radius:20px"></div></div>`;}
  function openProductModal(p){$('productForm').reset();$('editProductId').value=p?.id||'';$('productModalTitle').textContent=p?'Edit product':'Add product';$('productName').value=p?.name||'';$('productSlug').value=p?.slug||'';$('productCategory').value=p?.category_id||'';$('productImage').value=p?.image_url||'';$('productDescription').value=p?.description||'';$('productActive').value=String(p?.is_active??true);$('productFeatured').value=String(p?.is_featured??false);$('productFormMessage').textContent='';$('productModal').classList.add('open');}
  function closeProductModal(){$('productModal').classList.remove('open');}
  $('productName').addEventListener('input',()=>{if(!$('editProductId').value)$('productSlug').value=$('productName').value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');});
  $('productForm').addEventListener('submit',async e=>{e.preventDefault();if(!sb)return;const id=$('editProductId').value;const payload={name:$('productName').value.trim(),slug:$('productSlug').value.trim(),category_id:$('productCategory').value.trim()||null,image_url:$('productImage').value.trim()||null,description:$('productDescription').value.trim()||null,is_active:$('productActive').value==='true',is_featured:$('productFeatured').value==='true',updated_at:new Date().toISOString()};const btn=$('saveProduct');btn.disabled=true;$('productFormMessage').textContent='Saving…';let result=id?await sb.from('products').update(payload).eq('id',id).select().single():await sb.from('products').insert(payload).select().single();btn.disabled=false;if(result.error){$('productFormMessage').textContent=result.error.message;return;}closeProductModal();toast(id?'Product updated.':'Product created. Add its pack variants in Supabase until variant creation is enabled here.');await loadProducts();});
  async function toggleProduct(id){const p=products.find(x=>x.id===id);if(!p)return;const {error}=await sb.from('products').update({is_active:!p.is_active,updated_at:new Date().toISOString()}).eq('id',id);if(error){toast(error.message,true);return;}toast(`Product ${p.is_active?'deactivated':'activated'}.`);await loadProducts();}
  async function connect(){if(!configured()){setConnection(false,'Supabase is not configured. Edit admin-config.js with your Project URL and public key.');return;}if(!window.supabase){setConnection(false,'Supabase client library did not load. Check internet/CDN access.');return;}sb=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});const {data,error}=await sb.auth.getSession();if(error){setConnection(false,error.message);return;}session=data.session;if(session){showApp(session.user);setConnection(true,'Supabase client connected. Checking authorised admin access…');await verifyAdmin();}else{setConnection(true,'Supabase project reachable. Sign in with the configured admin account.');}}
  async function verifyAdmin(){if(!sb||!session)return;const {data,error}=await sb.from('admin_users').select('user_id,is_active,email').eq('user_id',session.user.id).maybeSingle();if(error){setConnection(false,'Signed in, but admin permission could not be verified: '+error.message);toast('Admin permission check failed. Apply the SQL setup and map your Auth user.',true);return;}if(!data||data.is_active!==true){await sb.auth.signOut();session=null;showLogin();$('loginMessage').textContent='This account is not enabled as an administrator. Ask the project owner to configure admin_users.';return;}setConnection(true,'Authenticated admin.');await Promise.all([loadProducts(),loadVariants()]);renderLowStock();}
  $('loginForm').addEventListener('submit',async e=>{e.preventDefault();if(!configured()){ $('loginMessage').textContent='Supabase is not configured yet. Edit admin-config.js first.';setConnection(false,'Missing Supabase configuration.');return;}if(!sb){await connect();if(!sb)return;}const btn=$('loginButton');btn.disabled=true;$('loginMessage').textContent='Signing in…';const {data,error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});btn.disabled=false;if(error){$('loginMessage').textContent=error.message;return;}session=data.session;showApp(data.user);await verifyAdmin();});
  $('logoutBtn').addEventListener('click',async()=>{if(sb)await sb.auth.signOut();session=null;showLogin();$('loginMessage').textContent='You have signed out.';});
  document.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>activateSection(b.dataset.section)));document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>activateSection(b.dataset.go)));
  $('mobileMenu').addEventListener('click',()=>$('sidebar').classList.toggle('open'));$('addProductBtn').addEventListener('click',()=>openProductModal());$('addProductTop').addEventListener('click',()=>openProductModal());$('quickAdd').addEventListener('click',()=>openProductModal());$('closeProductModal').addEventListener('click',closeProductModal);$('cancelProduct').addEventListener('click',closeProductModal);$('productModal').addEventListener('click',e=>{if(e.target===$('productModal'))closeProductModal();});
  $('productSearch').addEventListener('input',renderProducts);$('productFilter').addEventListener('change',renderProducts);$('variantSearch').addEventListener('input',renderVariants);$('stockFilter').addEventListener('change',renderVariants);$('refreshPricing').addEventListener('click',loadVariants);$('addVariantsBtn').addEventListener('click',createVariants);$('refreshOrders').addEventListener('click',loadOrders);$('retryConnection').addEventListener('click',connect);
  document.addEventListener('click',e=>{const edit=e.target.closest('[data-edit-product]');if(edit){const p=products.find(x=>x.id===edit.dataset.editProduct);if(p)openProductModal(p);}const tog=e.target.closest('[data-toggle-product]');if(tog)toggleProduct(tog.dataset.toggleProduct);const save=e.target.closest('[data-save-variant]');if(save)saveVariant(save.dataset.saveVariant);const orderSave=e.target.closest('[data-save-order-status]');if(orderSave){const id=orderSave.dataset.saveOrderStatus;const select=document.querySelector(`[data-order-status="${id}"]`);if(select)updateOrderStatus(id,select.value,orderSave);}});
  connect();
})();
