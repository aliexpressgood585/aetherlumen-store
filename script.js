const products = [
  {
    id: 1,
    name: "AetherLumen Pro LED Face Mask",
    price: 89.00,
    image: "images/wQ03c.jpg",
    description: "Advanced 7-color LED therapy mask with red, blue, and near-infrared light. Clinically inspired for anti-aging, acne reduction, and skin rejuvenation. Cordless, rechargeable, and designed for daily use."
  },
  {
    id: 2,
    name: "Pulse Recovery Massage Gun",
    price: 69.00,
    image: "images/MBBsk.jpg",
    description: "Professional-grade percussion massage gun with multiple speed settings and interchangeable heads. Relieves muscle tension, improves recovery, and feels like a deep tissue massage at home."
  },
  {
    id: 3,
    name: "Posture AI Corrector",
    price: 54.00,
    image: "images/rmvmN.jpg",
    description: "Smart wearable posture corrector with gentle vibration alerts. Helps improve alignment during work or workouts. Lightweight, adjustable, and discreet under clothing."
  },
  {
    id: 4,
    name: "Red Light Therapy Belt",
    price: 99.00,
    image: "images/S6yZO.jpg",
    description: "Flexible red and near-infrared light therapy belt for targeted body treatment. Ideal for muscle recovery, joint comfort, and circulation support. Wrap-around design with adjustable straps."
  },
  {
    id: 5,
    name: "Sunrise Smart Alarm Clock",
    price: 79.00,
    image: "images/98D93.jpg",
    description: "Circadian-friendly sunrise simulator alarm. Gradually brightens to wake you naturally. Features white noise, customizable light intensity, and elegant wood-accent design."
  },
  {
    id: 6,
    name: "Electric Scalp Massager",
    price: 39.00,
    image: "images/ALi9F.jpg",
    description: "Handheld electric scalp massager with soft nodes. Promotes relaxation, stimulates blood flow, and supports hair wellness. Perfect for stress relief after a long day."
  },
  {
    id: 7,
    name: "Jade Roller & Gua Sha Set",
    price: 29.00,
    image: "images/D03BL.jpg",
    description: "Premium natural jade facial tools set. Includes roller and gua sha stone for lymphatic drainage, depuffing, and enhanced product absorption. Comes in elegant packaging."
  }
];

let cart = [];

function renderProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = products.map(p => `
    <div class="product-card" onclick="openProduct(${p.id})">
      <img src="${p.image}" alt="${p.name}">
      <div class="product-info">
        <h3>${p.name}</h3>
        <div class="price">$${p.price.toFixed(2)}</div>
        <button class="add-btn" onclick="event.stopPropagation(); addToCart(${p.id})">Add to Cart</button>
      </div>
    </div>
  `).join('');
}

function addToCart(id) {
  const product = products.find(p => p.id === id);
  const existing = cart.find(item => item.id === id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  updateCart();
  const btn = event.target;
  const original = btn.textContent;
  btn.textContent = "Added!";
  setTimeout(() => btn.textContent = original, 1000);
}

function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  document.getElementById('cart-count').textContent = count;

  const itemsDiv = document.getElementById('cart-items');
  if (cart.length === 0) {
    itemsDiv.innerHTML = '<p style="text-align:center;padding:2rem;">Your cart is empty</p>';
  } else {
    itemsDiv.innerHTML = cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="">
        <div>
          <strong>${item.name}</strong><br>
          $${item.price.toFixed(2)} × ${item.qty}
          <button onclick="changeQty(${item.id}, -1)" style="margin-left:10px;">−</button>
          <button onclick="changeQty(${item.id}, 1)">+</button>
        </div>
      </div>
    `).join('');
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  document.getElementById('cart-total').textContent = total.toFixed(2);
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (item) {
    item.qty += delta;
    if (item.qty <= 0) {
      cart = cart.filter(i => i.id !== id);
    }
    updateCart();
  }
}

function toggleCart() {
  document.getElementById('cart-sidebar').classList.toggle('open');
}

function openProduct(id) {
  const product = products.find(p => p.id === id);
  document.getElementById('modal-body').innerHTML = `
    <img src="${product.image}" alt="${product.name}" style="width:100%;border-radius:12px;margin-bottom:1rem;">
    <h2>${product.name}</h2>
    <p class="price">$${product.price.toFixed(2)}</p>
    <p>${product.description}</p>
    <button class="add-btn" style="margin-top:1.5rem;" onclick="addToCart(${product.id}); closeModal();">Add to Cart</button>
  `;
  document.getElementById('product-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('product-modal').style.display = 'none';
}

function checkout() {
  if (cart.length === 0) {
    alert('Your cart is empty');
    return;
  }
  alert('Thank you! This is a demo store. In a real dropshipping setup, this would connect to Shopify, Stripe, or your supplier fulfillment system (e.g. via AliExpress/CJ Dropshipping).');
  cart = [];
  updateCart();
  toggleCart();
}

window.onclick = function(event) {
  const modal = document.getElementById('product-modal');
  if (event.target === modal) {
    closeModal();
  }
}

renderProducts();
updateCart();
