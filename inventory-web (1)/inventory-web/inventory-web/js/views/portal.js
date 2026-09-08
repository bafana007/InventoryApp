window.Views = window.Views || {};
window.Views.portal = (function () {
  function counts(user) {
    const mine = Store.requests({ requesterId: user.id });
    const result = {};
    Store.STATUSES.forEach(function (status) {
      result[status] = mine.filter(function (r) {
        return r.status === status;
      }).length;
    });
    return result;
  }

  async function dashboard(params, user) {
    const mine = Store.requests({ requesterId: user.id });
    const c = counts(user);
    let html = await Templates.load("portal-dashboard");
    html = html.replace("{{pageHead}}", UI.pageHead(
      "Hello, " + user.fullName,
      "Browse the catalog and track your requests.",
      '<a class="btn" href="#/portal/catalog">Browse catalog</a>'
    ));
    html = html.replace("<div data-insert=\"stat-1\"></div>", UI.stat(c.pending, "Pending", true));
    html = html.replace("<div data-insert=\"stat-2\"></div>", UI.stat(c.approved, "Approved"));
    html = html.replace("<div data-insert=\"stat-3\"></div>", UI.stat(c.fulfilled, "Fulfilled"));
    html = html.replace("<div data-insert=\"stat-4\"></div>", UI.stat(Store.searchProducts("").length, "Items in catalog"));

    let latestHtml = "";
    if (mine.length) {
      latestHtml = UI.table(
        ["#", "Raised", "Item", "Qty", "Status"],
        mine.slice(0, 5).map(function (r) {
          const product = Store.byId("products", r.productId);
          return [
            String(r.id),
            '<span class="muted">' + UI.datetime(r.createdAt) + "</span>",
            UI.escape(product ? product.name : "deleted product"),
            String(r.quantity),
            UI.badge(r.status, r.status === "pending"),
          ];
        })
      );
    } else {
      latestHtml = UI.empty("You have not requested anything yet.");
    }
    html = html.replace("<div data-insert=\"latest-requests-table\"></div>", latestHtml);
    return html;
  }

  async function catalog(params) {
    const query = params.q || "";
    const list = Store.searchProducts(query);
    const cards = list.length
      ? list
          .map(function (p) {
            const icon = p.imageUrl ? '<img src="' + UI.escape(p.imageUrl) + '" class="product-icon" alt="' + UI.escape(p.name) + '">' : (Store.productIcon(p) ? '<img src="' + Store.productIcon(p) + '" class="product-icon" alt="' + UI.escape(p.name) + '">' : "");
            return (
              '<div class="card"><h2>' +
              '<a href="#/admin/products">' + UI.escape(p.name) + "</a>" +
              '</h2>' +
              (icon ? icon : "") +
              '<p class="muted">' +
              UI.escape(p.sku) +
              " · " +
              UI.escape(Store.categoryName(p) || "uncategorised") +
              "</p><p>" +
              UI.escape(p.description || "No description provided.") +
              "</p><p>" +
              UI.badge(p.quantity === 0 ? "out of stock" : p.quantity + " available", p.quantity === 0) +
              "</p>" +
              '<form data-action="create-request" data-id="' +
              p.id +
              '"><div class="field-row">' +
              '<div class="field"><label>Quantity</label>' +
              '<input name="quantity" type="number" value="1" min="1" required></div>' +
              '<div class="field"><label>Reason</label>' +
              '<input name="reason" placeholder="What is it for?"></div></div>' +
              '<button type="submit"' +
              (p.quantity === 0 ? " disabled" : "") +
              ">Request item</button></form></div>"
            );
          })
          .join("")
      : UI.empty("No items match your search.");

    let html = await Templates.load("portal-catalog");
    html = html.replace("{{pageHead}}", UI.pageHead(
      "Catalog",
      "Request the items you need from the store.",
      '<form class="inline" data-action="search" data-route="#/portal/catalog">' +
        '<input name="q" value="' + UI.escape(query) + '" placeholder="Search name or SKU" style="max-width:220px">' +
        '<button type="submit">Search</button></form>'
    ));
    html = html.replace("<div data-insert=\"catalog-cards\"></div>", '<div class="grid cols-2">' + cards + "</div>");
    return html;
  }

  async function requests(params, user) {
    const mine = Store.requests({ requesterId: user.id });
    let html = await Templates.load("portal-requests");
    html = html.replace("{{pageHead}}", UI.pageHead(
      "My requests",
      mine.length + " total",
      '<a class="btn" href="#/portal/catalog">New request</a>'
    ));
    html = html.replace("<div data-insert=\"requests-table\"></div>", UI.table(
      ["#", "Raised", "Item", "Qty", "Reason", "Status", ""],
      mine.map(function (r) {
        const product = Store.byId("products", r.productId);
        return [
          String(r.id),
          '<span class="muted">' + UI.datetime(r.createdAt) + "</span>",
          UI.escape(product ? product.name : "deleted product") +
            '<div class="muted">' +
            UI.escape(product ? product.sku : "") +
            "</div>",
          String(r.quantity),
          '<span class="muted">' + UI.escape(r.reason) + "</span>",
          UI.badge(r.status, r.status === "pending"),
          r.status === "pending"
            ? '<form data-action="cancel-request" data-id="' +
              r.id +
              '"><button class="small ghost" type="submit">Cancel</button></form>'
            : "",
        ];
      })
    ));
    return html;
  }

  async function profile(params, user) {
    let html = await Templates.load("portal-profile");
    html = html.replace("{{pageHead}}", UI.pageHead("My profile", "@" + user.username + " · " + user.role));
    html = html.replace("{{username}}", UI.escape(user.username));
    html = html.replace("{{fullName}}", UI.escape(user.fullName));
    html = html.replace("{{email}}", UI.escape(user.email));
    return html;
  }

  async function chat(params, user) {
    let html = await Templates.load("chat");
    html = html.replace("{{pageHead}}", UI.pageHead("Chat", "Team communication."));
    Chat.stop();
    Chat.listen(function (msg) {
      appendChatMessage(msg, user);
    });
    Chat.markAllRead();
    return html;
  }

  function appendChatMessage(msg, user) {
    var container = document.getElementById("chat-messages");
    if (!container) return;
    var div = document.createElement("div");
    var isMine = msg.senderId === String(user.id);
    div.className = "chat-message " + (isMine ? "sent" : "received");
    var statusHtml = isMine ? '<div class="chat-status ' + msg.status + '">' + chatStatusIcon(msg.status) + "</div>" : "";
    div.innerHTML =
      '<div class="chat-meta">' +
      '<strong>' + UI.escape(msg.senderName) + '</strong>' +
      '<span class="muted">' + UI.escape(msg.senderRole) + '</span>' +
      '<span class="muted">' + UI.datetime(msg.timestamp) + "</span>" +
      "</div>" +
      '<div class="chat-text">' + UI.escape(msg.text) + "</div>" +
      statusHtml;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function chatStatusIcon(status) {
    if (status === "read") {
      return '<span>&#x2705;&#x2705;</span>';
    }
    if (status === "delivered") {
      return '<span>&#x2705;&#x2705;</span>';
    }
    return '<span>&#x2705;</span>';
  }

  return { dashboard: dashboard, catalog: catalog, requests: requests, profile: profile, chat: chat };
})();
