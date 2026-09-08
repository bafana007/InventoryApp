/* Hash router, navigation chrome and form action handling. */
(function () {
  const viewEl = document.getElementById("view");
  const topbarEl = document.getElementById("topbar");

  const ROUTES = {
    "/": { view: Views.auth.login, public: true },
    "/login": { view: Views.auth.login, public: true },
    "/admin/login": { view: Views.auth.adminLogin, public: true },
    "/employee/login": { view: Views.auth.employeeLogin, public: true },
    "/register": { view: Views.auth.register, public: true },
    "/admin-portal": { view: Views.auth.adminPortal, public: true },
    "/admin": { view: Views.admin.dashboard, roles: ["admin"] },
    "/admin/products": { view: Views.admin.products, roles: ["admin"] },
    "/admin/categories": { view: Views.admin.categories, roles: ["admin"] },
    "/admin/users": { view: Views.admin.users, roles: ["admin"] },
    "/admin/requests": { view: Views.admin.requests, roles: ["admin"] },
    "/admin/reports": { view: Views.admin.reports, roles: ["admin"] },
    "/admin/chat": { view: Views.admin.chat, roles: ["admin"] },
    "/employee": { view: Views.employee.dashboard, roles: ["admin", "employee"] },
    "/employee/stock": { view: Views.employee.stock, roles: ["admin", "employee"] },
    "/employee/requests": { view: Views.employee.requests, roles: ["admin", "employee"] },
    "/employee/chat": { view: Views.employee.chat, roles: ["admin", "employee"] },
    "/portal": { view: Views.portal.dashboard, roles: ["admin", "employee", "user"] },
    "/portal/catalog": { view: Views.portal.catalog, roles: ["admin", "employee", "user"] },
    "/portal/requests": { view: Views.portal.requests, roles: ["admin", "employee", "user"] },
    "/portal/profile": { view: Views.portal.profile, roles: ["admin", "employee", "user"] },
    "/portal/chat": { view: Views.portal.chat, roles: ["admin", "employee", "user"] },
  };

  const NAV = {
    admin: [
      ["#/admin", "Dashboard"],
      ["#/admin/products", "Products"],
      ["#/admin/categories", "Categories"],
      ["#/admin/users", "Users"],
      ["#/admin/requests", "Requests"],
      ["#/admin/reports", "Reports"],
      ["#/admin/chat", "Chat"],
      ["#/employee", "Stock desk"],
    ],
    employee: [
      ["#/employee", "Dashboard"],
      ["#/employee/stock", "Stock"],
      ["#/employee/requests", "Requests"],
      ["#/employee/chat", "Chat"],
    ],
    user: [
      ["#/portal", "Dashboard"],
      ["#/portal/catalog", "Catalog"],
      ["#/portal/requests", "My requests"],
      ["#/portal/profile", "Profile"],
      ["#/portal/chat", "Chat"],
    ],
  };

  function homeFor(user) {
    return { admin: "#/admin", employee: "#/employee", user: "#/portal" }[user.role] || "#/portal";
  }

  function parseHash() {
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path, queryString] = raw.split("?");
    const params = {};
    new URLSearchParams(queryString || "").forEach(function (value, key) {
      params[key] = value;
    });
    return { path: path, params: params };
  }

  function navigate(hash) {
    console.log("navigate", hash, "current:", location.hash);
    if (location.hash === hash) {
      render();
    } else {
      location.hash = hash;
    }
  }

  function showAppShell() {
    var loginPage = document.getElementById("login-page");
    var appShell = document.getElementById("app-shell");
    if (loginPage) loginPage.hidden = true;
    if (appShell) appShell.hidden = false;
  }

  function hideAppShell() {
    var loginPage = document.getElementById("login-page");
    var appShell = document.getElementById("app-shell");
    if (appShell) appShell.hidden = true;
    if (loginPage) loginPage.hidden = false;
  }

  function renderTopbar(user, path) {
    if (!user) {
      topbarEl.hidden = true;
      topbarEl.innerHTML = "";
      return;
    }
    topbarEl.hidden = false;
    const links = NAV[user.role]
      .map(function (item) {
        const active = path === item[0].slice(1) ? " active" : "";
        return '<a href="' + item[0] + '" class="' + active.trim() + '">' + item[1] + "</a>";
      })
      .join("");
    topbarEl.innerHTML =
      '<a class="brand" href="' +
      homeFor(user) +
      '">Inventory</a><nav>' +
      links +
      '<span class="role-chip">' +
      UI.escape(user.role) +
      " · " +
      UI.escape(user.username) +
      "</span>" +
      '<form class="inline" data-action="logout"><button class="small" type="submit">Sign out</button></form>' +
      "</nav>";
  }

  async function render() {
    const route = parseHash();
    const user = Store.currentUser();
    console.log("render", route.path, "user:", user ? user.role : null);

    if (Views.employee && Views.employee.stopScanner) {
      Views.employee.stopScanner();
    }

    const target = ROUTES[route.path];

    if (!user) {
      if (route.path === "/" || route.path === "") {
        hideAppShell();
        return;
      }
      if (target && target.public) {
        showAppShell();
        renderTopbar(null, route.path);
        viewEl.innerHTML = UI.flashesHtml() + await target.view();
        return;
      }
      hideAppShell();
      navigate("#/login");
      return;
    }

    showAppShell();

    if (route.path === "/" || route.path === "") {
      navigate(homeFor(user));
      return;
    }

    if (!target) {
      renderTopbar(user, route.path);
      viewEl.innerHTML =
        UI.flashesHtml() +
        '<div class="auth-wrap"><div class="auth-card"><h1>404</h1>' +
        "<p>That page does not exist.</p>" +
        '<a class="btn" href="' +
        homeFor(user) +
        '">Back</a></div></div>';
      return;
    }

    if (target.public) {
      navigate(homeFor(user));
      return;
    }

    if (target.roles.indexOf(user.role) === -1) {
      renderTopbar(user, route.path);
      viewEl.innerHTML =
        UI.flashesHtml() +
        '<div class="auth-wrap"><div class="auth-card"><h1>403</h1>' +
        "<p>You do not have access to this portal.</p>" +
        '<a class="btn" href="' +
        homeFor(user) +
        '">Back to my portal</a></div></div>';
      return;
    }

    renderTopbar(user, route.path);
    viewEl.innerHTML = UI.flashesHtml() + await target.view(route.params, user);
    window.scrollTo(0, 0);
    if (route.path === "/employee/stock" && Views.employee && Views.employee.initScanner) {
      Views.employee.initScanner();
    }
    if (
      route.path !== "/admin/chat" &&
      route.path !== "/employee/chat" &&
      route.path !== "/portal/chat"
    ) {
      if (window.Chat) {
        window.Chat.stop();
      }
    }
  }

  function withQuery(route, params) {
    const query = new URLSearchParams();
    Object.keys(params).forEach(function (key) {
      if (params[key]) query.set(key, params[key]);
    });
    const suffix = query.toString();
    return suffix ? route + "?" + suffix : route;
  }

  const ACTIONS = {
    login: function (data) {
      console.log("login action", data);
      const result = Store.login(data.username, data.password);
      console.log("login result", result);
      if (result.error) {
        UI.flash(result.error, "error");
        navigate("#/login");
        return;
      }
      UI.flash("Welcome back, " + result.user.fullName + ".", "success");
      showAppShell();
      navigate(homeFor(result.user));
    },

    "admin-login": function (data) {
      const result = Store.login(data.username, data.password);
      if (result.error) {
        UI.flash(result.error, "error");
        navigate("#/admin/login");
        return;
      }
      if (result.user.role !== "admin") {
        UI.flash("This portal is for admins only.", "error");
        navigate("#/admin/login");
        return;
      }
      UI.flash("Welcome back, " + result.user.fullName + ".", "success");
      showAppShell();
      navigate("#/admin");
    },

    "employee-login": function (data) {
      const result = Store.login(data.username, data.password);
      if (result.error) {
        UI.flash(result.error, "error");
        navigate("#/employee/login");
        return;
      }
      if (result.user.role !== "admin" && result.user.role !== "employee") {
        UI.flash("This portal is for employees only.", "error");
        navigate("#/employee/login");
        return;
      }
      UI.flash("Welcome back, " + result.user.fullName + ".", "success");
      showAppShell();
      navigate("#/employee");
    },

    register: function (data) {
      const result = Store.register(data.fullName, data.username, data.email, data.password, data.role);
      if (result.error) {
        UI.flash(result.error, "error");
        navigate("#/register");
        return;
      }
      UI.flash("Account created.", "success");
      showAppShell();
      navigate(homeFor(result.user));
    },

    logout: function () {
      Store.logout();
      hideAppShell();
      navigate("#/login");
    },

    "reset-data": function () {
      if (!confirm("Reset all data back to the demo seed?")) return;
      Store.reset();
      UI.flash("Demo data restored.", "success");
      navigate("#/login");
    },

    search: function (data, form) {
      navigate(withQuery(form.dataset.route, { q: data.q }));
    },

    filter: function (data, form) {
      navigate(withQuery(form.dataset.route, { status: data.status }));
    },

    "create-product": function (data, form, user) {
      var imageFile = form.querySelector('input[name="image"]') ? form.querySelector('input[name="image"]').files[0] : null;
      var createData = {
        sku: data.sku,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId ? Number(data.categoryId) : null,
        quantity: data.quantity,
        reorderLevel: data.reorderLevel,
        unitPrice: data.unitPrice,
        location: data.location,
      };

      function finishCreate(result) {
        if (result.error) {
          UI.flash(result.error, "error");
          render();
          return;
        }
        if (imageFile) {
          Store.uploadProductImage(String(result.product.id), imageFile)
            .then(function (downloadURL) {
              Store.updateProduct(String(result.product.id), { imageUrl: downloadURL });
              UI.flash("Product " + data.name + " created.", "success");
              render();
            })
            .catch(function (err) {
              UI.flash("Product created, but image upload failed: " + (err.message || err), "error");
              render();
            });
        } else {
          UI.flash("Product " + data.name + " created.", "success");
          render();
        }
      }

      var result = Store.createProduct(createData, user);
      if (result.error) {
        UI.flash(result.error, "error");
        render();
      } else if (!imageFile) {
        UI.flash("Product " + data.name + " created.", "success");
        render();
      } else {
        finishCreate(result);
      }
    },

    "edit-product": function (data, form) {
      const result = Store.updateProduct(form.dataset.id, {
        name: data.name,
        description: data.description,
        categoryId: data.categoryId ? Number(data.categoryId) : null,
        reorderLevel: data.reorderLevel,
        unitPrice: data.unitPrice,
        location: data.location,
      });
      UI.flash(result.error || "Product updated.", result.error ? "error" : "success");
      render();
    },

    "upload-product-image": function (data, form) {
      const fileInput = form.querySelector('input[name="image"]');
      const file = fileInput ? fileInput.files[0] : null;
      if (!file) {
        UI.flash("Select an image first.", "error");
        return;
      }
      Store.uploadProductImage(form.dataset.id, file)
        .then(function (downloadURL) {
          Store.updateProduct(form.dataset.id, { imageUrl: downloadURL });
          UI.flash("Image updated.", "success");
          render();
        })
        .catch(function (err) {
          UI.flash("Image upload failed: " + (err.message || err), "error");
        });
    },

    "delete-product": function (data, form) {
      if (!confirm("Delete " + form.dataset.sku + "?")) return;
      Store.deleteProduct(form.dataset.id);
      UI.flash("Product deleted.", "success");
      render();
    },

    "stock-move": function (data, form, user) {
      const result = Store.applyMovement(form.dataset.id, data.type, data.quantity, user, data.note);
      UI.flash(
        result.error || "Stock updated for " + result.product.sku + ".",
        result.error ? "error" : "success"
      );
      render();
    },

    "create-category": function (data) {
      const result = Store.createCategory(data.name, data.description);
      UI.flash(
        result.error || "Category " + data.name + " created.",
        result.error ? "error" : "success"
      );
      render();
    },

    "create-user": function (data) {
      const result = Store.createUser(data);
      UI.flash(
        result.error || "User " + data.username + " created.",
        result.error ? "error" : "success"
      );
      render();
    },

    "set-role": function (data, form, user) {
      const result = Store.setRole(form.dataset.id, data.role, user);
      UI.flash(
        result.error || result.user.username + " is now " + result.user.role + ".",
        result.error ? "error" : "success"
      );
      render();
    },

    "toggle-user": function (data, form, user) {
      const result = Store.toggleUser(form.dataset.id, user);
      UI.flash(
        result.error ||
          result.user.username + (result.user.isActive ? " activated." : " deactivated."),
        result.error ? "error" : "success"
      );
      render();
    },

    "create-request": function (data, form, user) {
      const result = Store.createRequest(form.dataset.id, data.quantity, data.reason, user);
      if (result.error) {
        UI.flash(result.error, "error");
        render();
        return;
      }
      UI.flash(
        "Request submitted for " + result.request.quantity + " x " + result.product.name + ".",
        "success"
      );
      navigate("#/portal/requests");
    },

    "cancel-request": function (data, form, user) {
      const result = Store.cancelRequest(form.dataset.id, user);
      UI.flash(result.error || "Request cancelled.", result.error ? "error" : "success");
      render();
    },

    "handle-request": function (data, form, user) {
      const past = { approve: "approved", reject: "rejected", fulfill: "fulfilled" };
      const result = Store.handleRequest(form.dataset.id, form.dataset.op, user);
      UI.flash(
        result.error || "Request #" + form.dataset.id + " " + past[form.dataset.op] + ".",
        result.error ? "error" : "success"
      );
      render();
    },

    "update-profile": function (data, form, user) {
      const result = Store.updateProfile(
        user,
        data.username,
        data.fullName,
        data.email,
        data.currentPassword,
        data.newPassword
      );
      UI.flash(result.error || "Profile updated.", result.error ? "error" : "success");
      render();
    },

    "chat-send": function (data, form, user) {
      var text = (data.text || "").trim();
      if (!text) return;
      Chat.send({
        senderId: user.id,
        senderName: user.fullName,
        senderRole: user.role,
        text: text,
        timestamp: Date.now(),
      });
      form.reset();
    },

    "google-login": function (data, form) {
      const portal = (form && form.dataset && form.dataset.portal) || "all";
      const provider = new firebase.auth.GoogleAuthProvider();

      firebase.auth().signInWithPopup(provider).then(function (result) {
        const googleUser = result.user;
        const email = googleUser.email;
        const displayName = googleUser.displayName;

        const users = Store.users();
        let localUser = users.find(function (u) {
          return u.email && u.email.toLowerCase() === email.toLowerCase();
        });

        if (!localUser) {
          if (portal === "admin") {
            UI.flash("No admin account found for this Google email.", "error");
            return;
          }
          if (portal === "employee") {
            UI.flash("No employee account found for this Google email.", "error");
            return;
          }
          let baseUsername = (displayName || email).replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          let username = baseUsername;
          let suffix = 1;
          while (users.some(function (u) { return u.username.toLowerCase() === username.toLowerCase(); })) {
            username = baseUsername + suffix;
            suffix++;
          }
          const createResult = Store.createUser({
            username: username,
            fullName: displayName || email.split("@")[0],
            email: email,
            password: Math.random().toString(36).slice(2),
            role: "user",
          });
          if (createResult.error) {
            UI.flash(createResult.error, "error");
            return;
          }
          localUser = createResult.user;
        } else {
          if (portal === "admin" && localUser.role !== "admin") {
            UI.flash("This portal is for admins only.", "error");
            return;
          }
          if (portal === "employee" && localUser.role !== "admin" && localUser.role !== "employee") {
            UI.flash("This portal is for employees only.", "error");
            return;
          }
        }

        localStorage.setItem("inventory-session-v1", String(localUser.id));
        UI.flash("Welcome, " + localUser.fullName + ".", "success");
        if (portal === "admin") {
          navigate("#/admin");
        } else if (portal === "employee") {
          navigate("#/employee");
        } else {
          navigate(homeFor(localUser));
        }
      }).catch(function (error) {
        UI.flash(error.message || "Google login failed.", "error");
      });
    },
  };

  document.addEventListener("submit", function (event) {
    const form = event.target.closest("form[data-action]");
    console.log("submit event", event.target, form);
    if (!form) return;
    event.preventDefault();
    console.log("prevented default, action:", form.dataset.action);
    const handler = ACTIONS[form.dataset.action];
    if (!handler) return;
    handler(UI.formData(form), form, Store.currentUser());
  });

  console.log("app.js loaded, event listeners attached");
  window.addEventListener("hashchange", render);
  render();
})();
