/* =====================================================
   School Uniform Ordering System (HTML + CSS + JavaScript)
   Products, stock and orders are saved in localStorage.
   Works on GitHub Pages: no server or backend needed.
   ===================================================== */
(function () {
  "use strict";

  var STORAGE_KEY = "uniformSystemData";

  var DEFAULT_PRODUCTS = [
    { id: 1, name: "School Uniform",   price: 12, stock: 30, sizes: ["S", "M", "L", "XL"] },
    { id: 2, name: "School Pants",     price: 18, stock: 25, sizes: ["S", "M", "L", "XL"] },
    { id: 3, name: "PE T-Shirt",       price: 10, stock: 40, sizes: ["S", "M", "L", "XL"] },
    { id: 4, name: "PE Jogging Pants", price: 14, stock: 35, sizes: ["S", "M", "L", "XL"] },
    { id: 5, name: "School Shoes",     price: 25, stock: 20, sizes: ["36", "37", "38", "39", "40", "41", "42"] },
    { id: 6, name: "ID Lace",          price: 3,  stock: 50, sizes: ["One Size"] }
  ];

  var products = [];
  var orders = [];
  var searchTerm = "";

  // ---------- 2. Shortcuts to page elements ----------
  function $(id) { return document.getElementById(id); }

  var el = {
    message: $("message"), productList: $("productList"), orderTable: $("orderTable"),
    orderCount: $("orderCount"), form: $("orderForm"), name: $("studentName"), studentId: $("studentId"),
    product: $("product"), size: $("size"), quantity: $("quantity"), totalPrice: $("totalPrice"),
    resetBtn: $("resetBtn"), viewOrdersBtn: $("viewOrdersBtn"), ordersSection: $("ordersSection"),
    searchForm: $("searchForm"), searchInput: $("searchInput"),
    statOrders: $("statOrders"), statSales: $("statSales"), statItems: $("statItems"), statStock: $("statStock")
  };

  // ---------- 3. Helper functions ----------
  function money(n) { return "₱" + Number(n).toFixed(2); }

  function findProduct(id) {
    for (var i = 0; i < products.length; i++) { if (products[i].id === id) return products[i]; }
    return null;
  }

  function esc(text) {   // stops typed text from being treated as HTML
    return String(text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var messageTimer = null;
  function showMessage(text, type) {
    el.message.innerHTML = '<span class="' + type + '">' + esc(text) + "</span>";
    clearTimeout(messageTimer);
    messageTimer = setTimeout(function () { el.message.innerHTML = ""; }, 4500);
  }

  // ---------- 4. localStorage (safe loading and saving) ----------
  function isWholeNumber(n) { return typeof n === "number" && isFinite(n) && Math.floor(n) === n; }

  function loadState() {
    // Start from the default products
    products = DEFAULT_PRODUCTS.map(function (p) {
      return { id: p.id, name: p.name, price: p.price, stock: p.stock, sizes: p.sizes.slice() };
    });
    orders = [];

    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { saved = null; }
    if (!saved || typeof saved !== "object") return;

    // Use saved stock only if it is a valid number
    if (Array.isArray(saved.stock)) {
      saved.stock.forEach(function (s) {
        var p = s && findProduct(s.id);
        if (p && isWholeNumber(s.stock) && s.stock >= 0) p.stock = s.stock;
      });
    }
    // Use only saved orders that are complete and valid
    if (Array.isArray(saved.orders)) {
      saved.orders.forEach(function (o) {
        if (o && isWholeNumber(o.id) && findProduct(o.productId) && isWholeNumber(o.qty) && o.qty > 0 &&
            typeof o.name === "string" && typeof o.studentId === "string" &&
            typeof o.size === "string" && typeof o.total === "number") {
          orders.push({ id: o.id, date: String(o.date || ""), name: o.name, studentId: o.studentId,
                        productId: o.productId, size: o.size, qty: o.qty, total: o.total });
        }
      });
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        stock: products.map(function (p) { return { id: p.id, stock: p.stock }; }),
        orders: orders
      }));
      return true;
    } catch (e) {
      showMessage("Warning: your browser blocked saving, so data will be lost on refresh.", "fail");
      return false;
    }
  }

  // ---------- 5. Display: dashboard, products, form lists, orders ----------
  function renderDashboard() {
    var sales = 0, items = 0, stock = 0;
    orders.forEach(function (o) { sales += o.total; items += o.qty; });
    products.forEach(function (p) { stock += p.stock; });
    el.statOrders.textContent = orders.length;
    el.statSales.textContent = money(sales);
    el.statItems.textContent = items;
    el.statStock.textContent = stock;
  }

  function renderProducts() {
    var html = "";
    products.forEach(function (p) {
      var badge = p.stock === 0 ? '<span class="badge out">Out of stock</span>'
                : p.stock <= 5  ? '<span class="badge low">Only ' + p.stock + " left</span>"
                :                 '<span class="badge">' + p.stock + " in stock</span>";
      html += '<div class="product' + (p.stock === 0 ? " empty" : "") + '"><h3>' + esc(p.name) + "</h3>" +
              '<div class="price">' + money(p.price) + "</div>" +
              "<p>Sizes: " + esc(p.sizes.join(", ")) + "</p><p>" + badge + "</p></div>";
    });
    el.productList.innerHTML = html;
  }

  function renderProductSelect() {
    var chosen = el.product.value;
    var html = '<option value="">-- Select product --</option>';
    products.forEach(function (p) {
      html += '<option value="' + p.id + '">' + esc(p.name) + " - " + money(p.price) + " (stock: " + p.stock + ")</option>";
    });
    el.product.innerHTML = html;
    el.product.value = chosen;
  }

  function renderSizeSelect(keepChoice) {
    var chosenSize = keepChoice ? el.size.value : "";
    var product = findProduct(Number(el.product.value));
    var html = '<option value="">-- Select size --</option>';
    if (product) {
      product.sizes.forEach(function (s) { html += "<option>" + esc(s) + "</option>"; });
    }
    el.size.innerHTML = html;
    el.size.value = chosenSize;
  }

  function updateTotal() {
    var product = findProduct(Number(el.product.value));
    var qty = Number(el.quantity.value);
    el.totalPrice.textContent = money(product && qty > 0 ? product.price * qty : 0);
  }

  function renderOrders() {
    var term = searchTerm.toLowerCase();
    var list = orders.filter(function (o) {
      return o.name.toLowerCase().indexOf(term) !== -1 || o.studentId.toLowerCase().indexOf(term) !== -1;
    });

    el.orderCount.textContent = term ? "Showing " + list.length + " of " + orders.length + " orders" : orders.length + " order(s)";

    if (list.length === 0) {
      el.orderTable.innerHTML = '<tr><td colspan="9" class="empty-row">' +
        (orders.length === 0 ? "No orders yet." : "No orders match your search.") + "</td></tr>";
      return;
    }
    var html = "";
    list.forEach(function (o) {
      var p = findProduct(o.productId);
      html += "<tr><td>" + o.id + "</td><td>" + esc(o.date) + "</td><td>" + esc(o.name) + "</td><td>" + esc(o.studentId) +
              "</td><td>" + esc(p ? p.name : "") + "</td><td>" + esc(o.size) + "</td><td>" + o.qty + "</td><td>" + money(o.total) +
              '</td><td><button type="button" class="btn red" data-cancel="' + o.id + '">Cancel Order</button></td></tr>';
    });
    el.orderTable.innerHTML = html;
  }

  // Refresh everything on screen after any action
  function renderAll() {
    renderDashboard();
    renderProducts();
    renderProductSelect();
    renderSizeSelect(true);
    updateTotal();
    renderOrders();
  }

  // ---------- 6. Form helpers ----------
  function clearErrors() {
    ["studentName", "studentId", "product", "size", "quantity"].forEach(function (id) {
      $(id + "Error").textContent = "";
      $(id).classList.remove("invalid");
    });
  }

  function setError(fieldId, text) {
    $(fieldId + "Error").textContent = text;
    $(fieldId).classList.add("invalid");
  }

  function resetForm() {
    el.form.reset();
    clearErrors();
    el.quantity.value = 1;
    renderProductSelect();
    el.product.value = "";
    renderSizeSelect(false);
    updateTotal();
  }

  // ---------- 7. Place an order ----------
  function handlePlaceOrder(event) {
    event.preventDefault();
    clearErrors();

    var name = el.name.value.trim();
    var studentId = el.studentId.value.trim();
    var product = findProduct(Number(el.product.value));
    var size = el.size.value;
    var qtyText = el.quantity.value.trim();
    var qty = Number(qtyText);
    var valid = true;

    if (!/^[A-Za-z][A-Za-z .'-]{1,49}$/.test(name)) {
      setError("studentName", "Enter a valid name (letters only, at least 2 characters).");
      valid = false;
    }
    if (!/^[A-Za-z0-9-]{3,20}$/.test(studentId)) {
      setError("studentId", "Student ID must be 3-20 letters, numbers or dashes.");
      valid = false;
    }
    if (!product) {
      setError("product", "Please choose a product.");
      valid = false;
    } else if (!size || product.sizes.indexOf(size) === -1) {
      setError("size", "Please choose a size.");
      valid = false;
    }
    if (qtyText === "" || !isWholeNumber(qty) || qty < 1) {
      setError("quantity", "Quantity must be a whole number of 1 or more.");
      valid = false;
    }
    if (!valid) { showMessage("Please fix the errors in the form.", "fail"); return; }

    if (qty > product.stock) {
      var text = product.stock === 0 ? product.name + " is out of stock."
                                     : "Not enough stock. Only " + product.stock + " " + product.name + " left.";
      setError("quantity", text);
      showMessage(text, "fail");
      return;
    }

    var nextId = 1;
    orders.forEach(function (o) { if (o.id >= nextId) nextId = o.id + 1; });
    var total = product.price * qty;

    product.stock -= qty;
    orders.push({ id: nextId, date: new Date().toLocaleString(), name: name, studentId: studentId,
                  productId: product.id, size: size, qty: qty, total: total });

    saveState();
    searchTerm = ""; el.searchInput.value = "";
    resetForm();
    renderAll();
    showMessage("Order #" + nextId + " placed successfully! Total: " + money(total), "success");
  }

  // ---------- 8. Cancel an order ----------
  function handleCancelClick(event) {
    var btn = event.target.closest ? event.target.closest("[data-cancel]") : null;
    if (!btn) return;

    var id = Number(btn.getAttribute("data-cancel"));
    var order = null;
    orders.forEach(function (o) { if (o.id === id) order = o; });
    if (!order) return;

    if (!window.confirm("Cancel order #" + id + " for " + order.name + "?")) return;

    var product = findProduct(order.productId);
    if (product) product.stock += order.qty;                       // restore stock
    orders = orders.filter(function (o) { return o.id !== id; });  // remove the order

    saveState();
    renderAll();
    showMessage("Order #" + id + " cancelled. Stock restored.", "success");
  }

  // ---------- 9. Search and View Orders ----------
  function handleSearch(event) {
    event.preventDefault();
    searchTerm = el.searchInput.value.trim();
    renderOrders();
    if (searchTerm) showMessage("Search finished.", "success");
  }

  function handleViewOrders() {
    searchTerm = "";
    el.searchInput.value = "";
    renderOrders();
    el.ordersSection.scrollIntoView({ behavior: "smooth", block: "start" });
    showMessage("Showing all " + orders.length + " order(s).", "success");
  }

  // ---------- 10. Start: connect each listener once ----------
  function init() {
    loadState();

    el.form.addEventListener("submit", handlePlaceOrder);
    el.resetBtn.addEventListener("click", function () { resetForm(); showMessage("Form cleared.", "success"); });
    el.product.addEventListener("change", function () { renderSizeSelect(false); updateTotal(); });
    el.quantity.addEventListener("input", updateTotal);
    el.orderTable.addEventListener("click", handleCancelClick);
    el.searchForm.addEventListener("submit", handleSearch);
    el.searchInput.addEventListener("input", function () { searchTerm = el.searchInput.value.trim(); renderOrders(); });
    el.viewOrdersBtn.addEventListener("click", handleViewOrders);

    renderAll();
  }

  init();
})();
