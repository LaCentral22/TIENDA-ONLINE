let cart = [];
function addToCart(name, price) { cart.push({ name: name, price: price });
updateCart();
}
function updateCart() { const cartItems = document.getElementById("cart-items"); const cartCount = document.getElementById("cart-count"); const cartTotal = document.getElementById("cart-total");
cartCount.textContent = cart.length;

if (cart.length === 0) {
    cartItems.innerHTML = "<p>Tu carrito está vacío.</p>";
    cartTotal.textContent = "0,00 €";
    return;
}

let total = 0;

cartItems.innerHTML = "";

cart.forEach((item, index) => {
    total += item.price;

    const div = document.createElement("div");
    div.className = "cart-item";

    div.innerHTML = `
        <span>${item.name} - ${item.price.toFixed(2)} €</span>
        <button onclick="removeFromCart(${index})">Eliminar</button>
    `;

    cartItems.appendChild(div);
});

cartTotal.textContent = total.toFixed(2) + " €";
}
function removeFromCart(index) { cart.splice(index, 1); updateCart(); }
function checkout() { if (cart.length === 0) { alert("Tu carrito está vacío."); return; }
alert("El sistema de pago se conectará en el siguiente paso.");
}
