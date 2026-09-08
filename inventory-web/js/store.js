/* Data layer: everything is persisted in localStorage under a single key. */
window.Store = (function () {
  const KEY = "inventory-system-v1";
  const SESSION_KEY = "inventory-session-v1";

  const ROLES = ["admin", "employee", "user"];
  const STATUSES = ["pending", "approved", "rejected", "fulfilled"];

  const SEED = {
    nextId: {},
    users: [
      ["admin", "Alice Admin", "admin@example.com", "admin", "admin123"],
      ["employee", "Eli Employee", "employee@example.com", "employee", "employee123"],
      ["user", "Uma User", "user@example.com", "user", "user123"],
    ],
    categories: [
      ["Stationery", "Office and paper supplies"],
      ["Electronics", "Devices, cables and accessories"],
      ["Cleaning", "Janitorial consumables"],
    ],
    products: [
      ["SKU-1001", "A4 Paper Ream", "Stationery", 120, 20, 6.5, "A1-01"],
      ["SKU-1002", "Ballpoint Pen (Box of 50)", "Stationery", 18, 20, 12.0, "A1-02"],
      ["SKU-1003", "Notebook A5", "Stationery", 80, 15, 3.25, "A1-03"],
      ["SKU-1004", "Highlighter Set", "Stationery", 50, 10, 5.75, "A1-04"],
      ["SKU-2001", "USB-C Cable 2m", "Electronics", 45, 10, 8.75, "B2-04"],
      ["SKU-2002", "Wireless Mouse", "Electronics", 7, 8, 21.99, "B2-05"],
      ["SKU-2003", "HDMI Cable 1m", "Electronics", 35, 10, 6.5, "B2-01"],
      ["SKU-2004", "Webcam HD", "Electronics", 12, 5, 45.0, "B2-02"],
      ["SKU-3001", "Disinfectant 5L", "Cleaning", 30, 6, 15.4, "C3-01"],
      ["SKU-3002", "Microfibre Cloth", "Cleaning", 4, 10, 2.25, "C3-02"],
      ["SKU-3003", "Paper Towels", "Cleaning", 60, 15, 4.5, "C3-03"],
      ["SKU-3004", "Hand Sanitizer 500ml", "Cleaning", 25, 8, 3.99, "C3-04"],
    ],
  };

  let db = null;

  /* Demo-only password digest. This is a client-side app with no server, so it
     obfuscates rather than secures — never reuse a real password here. */
  function digest(password) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < password.length; i++) {
      h1 = Math.imul(h1 ^ password.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 + password.charCodeAt(i) * (i + 1), 2246822519) >>> 0;
    }
    return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
  }

  function nextId(collection) {
    db.nextId[collection] = (db.nextId[collection] || 0) + 1;
    return db.nextId[collection];
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(db));
    if (window.DB) {
      window.DB.sync(db).catch(function (err) {
        console.warn("RTDB sync failed:", err);
      });
    }
  }

  function seed() {
    db = { nextId: {}, users: [], categories: [], products: [], movements: [], requests: [] };
    SEED.users.forEach(function (row) {
      db.users.push({
        id: nextId("users"),
        username: row[0],
        fullName: row[1],
        email: row[2],
        role: row[3],
        passwordHash: digest(row[4]),
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    });
    SEED.categories.forEach(function (row) {
      db.categories.push({ id: nextId("categories"), name: row[0], description: row[1] });
    });
    const admin = db.users[0];
    SEED.products.forEach(function (row) {
      const category = db.categories.find(function (c) {
        return c.name === row[2];
      });
      const product = {
        id: nextId("products"),
        sku: row[0],
        name: row[1],
        categoryId: category ? category.id : null,
        quantity: row[3],
        reorderLevel: row[4],
        unitPrice: row[5],
        location: row[6],
        description: row[1] + " held in " + row[6] + ".",
        createdAt: new Date().toISOString(),
      };
      db.products.push(product);
      db.movements.push({
        id: nextId("movements"),
        productId: product.id,
        userId: admin.id,
        type: "in",
        quantity: product.quantity,
        note: "Opening stock",
        createdAt: new Date().toISOString(),
      });
    });
    save();
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      seed();
      return;
    }
    try {
      db = JSON.parse(raw);
    } catch (err) {
      seed();
    }
  }

  function reset() {
    localStorage.removeItem(SESSION_KEY);
    seed();
  }

  /* --- lookups --- */
  const byId = function (collection, id) {
    return db[collection].find(function (row) {
      return row.id === Number(id);
    });
  };

  function categoryName(product) {
    const category = product.categoryId ? byId("categories", product.categoryId) : null;
    return category ? category.name : null;
  }

  function isLowStock(product) {
    return product.quantity <= product.reorderLevel;
  }

  function stockValue(product) {
    return product.quantity * product.unitPrice;
  }

  function productIcon(product) {
    const map = {
      "SKU-1001": "a4-paper-ream.svg",
      "SKU-1002": "ballpoint-pen-box-of-50.svg",
      "SKU-1003": "notebook-a5.svg",
      "SKU-1004": "highlighter-set.svg",
      "SKU-2001": "usb-c-cable-2m.svg",
      "SKU-2002": "wireless-mouse.svg",
      "SKU-2003": "hdmi-cable-1m.svg",
      "SKU-2004": "webcam-hd.svg",
      "SKU-3001": "disinfectant-5l.svg",
      "SKU-3002": "microfibre-cloth.svg",
      "SKU-3003": "paper-towels.svg",
      "SKU-3004": "hand-sanitizer-500ml.svg",
    };
    const file = map[product.sku];
    return file ? "product-icons/" + file : null;
  }

  function searchProducts(query) {
    const term = (query || "").trim().toLowerCase();
    return db.products
      .filter(function (p) {
        return !term || p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
      })
      .sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
  }

  function metrics() {
    const products = db.products;
    const lowStock = products.filter(isLowStock);
    return {
      productCount: products.length,
      totalUnits: products.reduce(function (sum, p) {
        return sum + p.quantity;
      }, 0),
      stockValue: products.reduce(function (sum, p) {
        return sum + stockValue(p);
      }, 0),
      lowStock: lowStock,
      lowStockCount: lowStock.length,
      pendingRequests: db.requests.filter(function (r) {
        return r.status === "pending";
      }).length,
      userCount: db.users.length,
    };
  }

  /* --- auth --- */
  function findUser(username) {
    return db.users.find(function (u) {
      return u.username.toLowerCase() === String(username).toLowerCase();
    });
  }

  function login(username, password) {
    const user = findUser(username);
    console.log("Store.login", username, "found:", !!user, "hashMatch:", user ? user.passwordHash === digest(password) : false);
    if (!user || user.passwordHash !== digest(password)) {
      return { error: "Invalid username or password." };
    }
    if (!user.isActive) {
      return { error: "This account has been deactivated." };
    }
    localStorage.setItem(SESSION_KEY, String(user.id));
    return { user: user };
  }

  function register(fullName, username, email, password, role) {
    const taken = db.users.some(function (u) {
      return (
        u.username.toLowerCase() === username.toLowerCase() ||
        u.email.toLowerCase() === email.toLowerCase()
      );
    });
    if (taken) {
      return { error: "Username or email is already registered." };
    }
    const user = {
      id: nextId("users"),
      username: username,
      fullName: fullName,
      email: email,
      role: role === "admin" || role === "employee" ? role : "user",
      passwordHash: digest(password),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    save();
    localStorage.setItem(SESSION_KEY, String(user.id));
    return { user: user };
  }

  function currentUser() {
    const id = localStorage.getItem(SESSION_KEY);
    console.log("Store.currentUser", "sessionId:", id);
    if (!id) return null;
    const user = byId("users", id);
    console.log("Store.currentUser", "found:", !!user, "active:", user ? user.isActive : false);
    if (!user || !user.isActive) {
      logout();
      return null;
    }
    return user;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  /* --- products --- */
  function createProduct(data, actor) {
    if (db.products.some(function (p) { return p.sku === data.sku; })) {
      return { error: "SKU " + data.sku + " already exists." };
    }
    const product = {
      id: nextId("products"),
      sku: data.sku,
      name: data.name,
      description: data.description || "",
      categoryId: data.categoryId || null,
      quantity: Number(data.quantity) || 0,
      reorderLevel: Number(data.reorderLevel) || 0,
      unitPrice: Number(data.unitPrice) || 0,
      location: data.location || "",
      imageUrl: data.imageUrl || "",
      createdAt: new Date().toISOString(),
    };
    db.products.push(product);
    if (product.quantity) {
      db.movements.push({
        id: nextId("movements"),
        productId: product.id,
        userId: actor.id,
        type: "in",
        quantity: product.quantity,
        note: "Opening stock",
        createdAt: new Date().toISOString(),
      });
    }
    save();
    return { product: product };
  }

  function updateProduct(id, data) {
    const product = byId("products", id);
    if (!product) return { error: "Product not found." };
    product.name = data.name;
    product.description = data.description || "";
    product.categoryId = data.categoryId || null;
    product.reorderLevel = Number(data.reorderLevel) || 0;
    product.unitPrice = Number(data.unitPrice) || 0;
    product.location = data.location || "";
    if (data.imageUrl !== undefined) {
      product.imageUrl = data.imageUrl || "";
    }
    save();
    return { product: product };
  }

  function uploadProductImage(productId, file) {
    const product = byId("products", productId);
    if (!product) return Promise.reject(new Error("Product not found."));
    if (!file) return Promise.reject(new Error("No file selected."));

    return new Promise(function (resolve, reject) {
      const storageRef = firebase.storage().ref("products/" + productId + "/" + Date.now() + "_" + file.name);
      const uploadTask = storageRef.put(file);

      uploadTask.on(
        firebase.storage.TaskEvent.STATE_CHANGED,
        function (snapshot) {
          var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
        },
        function (error) {
          console.warn("Upload failed", error);
          reject(error);
        },
        function () {
          uploadTask.snapshot.ref.getDownloadURL().then(function (downloadURL) {
            resolve(downloadURL);
          }).catch(function (error) {
            reject(error);
          });
        }
      );
    });
  }

  function deleteProduct(id) {
    const productId = Number(id);
    db.products = db.products.filter(function (p) {
      return p.id !== productId;
    });
    db.movements = db.movements.filter(function (m) {
      return m.productId !== productId;
    });
    db.requests = db.requests.filter(function (r) {
      return r.productId !== productId;
    });
    save();
  }

  /* --- stock --- */
  function applyMovement(productId, type, quantity, actor, note) {
    const product = byId("products", productId);
    if (!product) return { error: "Product not found." };
    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) return { error: "Quantity must be zero or more." };
    if (type !== "adjust" && qty <= 0) return { error: "Quantity must be greater than zero." };

    if (type === "in") {
      product.quantity += qty;
    } else if (type === "out") {
      if (qty > product.quantity) {
        return {
          error: "Cannot remove " + qty + " units; only " + product.quantity + " in stock.",
        };
      }
      product.quantity -= qty;
    } else {
      product.quantity = qty;
    }

    db.movements.push({
      id: nextId("movements"),
      productId: product.id,
      userId: actor ? actor.id : null,
      type: type,
      quantity: qty,
      note: note || "",
      createdAt: new Date().toISOString(),
    });
    save();
    return { product: product };
  }

  function movements(limit, userId) {
    return db.movements
      .filter(function (m) {
        return userId === undefined || m.userId === userId;
      })
      .slice()
      .sort(function (a, b) {
        return b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
      })
      .slice(0, limit || db.movements.length);
  }

  /* --- categories --- */
  function createCategory(name, description) {
    if (db.categories.some(function (c) { return c.name.toLowerCase() === name.toLowerCase(); })) {
      return { error: "Category already exists." };
    }
    const category = { id: nextId("categories"), name: name, description: description || "" };
    db.categories.push(category);
    save();
    return { category: category };
  }

  function categories() {
    return db.categories.slice().sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  }

  function productsInCategory(categoryId) {
    return db.products.filter(function (p) {
      return p.categoryId === categoryId;
    });
  }

  /* --- users --- */
  function users() {
    return db.users.slice().sort(function (a, b) {
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  function createUser(data) {
    const taken = db.users.some(function (u) {
      return (
        u.username.toLowerCase() === data.username.toLowerCase() ||
        u.email.toLowerCase() === data.email.toLowerCase()
      );
    });
    if (taken) return { error: "Username or email already in use." };
    const user = {
      id: nextId("users"),
      username: data.username,
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      passwordHash: digest(data.password),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    save();
    return { user: user };
  }

  function setRole(userId, role, actor) {
    const target = byId("users", userId);
    if (!target) return { error: "User not found." };
    if (target.id === actor.id) return { error: "You cannot change your own role." };
    target.role = role;
    save();
    return { user: target };
  }

  function toggleUser(userId, actor) {
    const target = byId("users", userId);
    if (!target) return { error: "User not found." };
    if (target.id === actor.id) return { error: "You cannot deactivate your own account." };
    target.isActive = !target.isActive;
    save();
    return { user: target };
  }

  function updateProfile(user, username, fullName, email, currentPassword, newPassword) {
    if (username && username.toLowerCase() !== user.username.toLowerCase()) {
      const taken = db.users.some(function (u) {
        return u.id !== user.id && u.username.toLowerCase() === username.toLowerCase();
      });
      if (taken) {
        return { error: "Username is already taken." };
      }
      user.username = username;
    }
    if (newPassword) {
      if (digest(currentPassword) !== user.passwordHash) {
        return { error: "Current password is incorrect." };
      }
      user.passwordHash = digest(newPassword);
    }
    user.fullName = fullName;
    user.email = email;
    save();
    return { user: user };
  }

  /* --- requests --- */
  function requests(filter) {
    filter = filter || {};
    return db.requests
      .filter(function (r) {
        if (filter.status && r.status !== filter.status) return false;
        if (filter.requesterId && r.requesterId !== filter.requesterId) return false;
        return true;
      })
      .slice()
      .sort(function (a, b) {
        return b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
      });
  }

  function createRequest(productId, quantity, reason, actor) {
    const product = byId("products", productId);
    if (!product) return { error: "Product not found." };
    const qty = Number(quantity);
    if (!qty || qty <= 0) return { error: "Quantity must be greater than zero." };
    const request = {
      id: nextId("requests"),
      productId: product.id,
      requesterId: actor.id,
      handledById: null,
      quantity: qty,
      reason: reason || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    db.requests.push(request);
    save();
    return { request: request, product: product };
  }

  function handleRequest(requestId, action, actor) {
    const request = byId("requests", requestId);
    if (!request) return { error: "Request not found." };
    if (action === "approve") {
      request.status = "approved";
    } else if (action === "reject") {
      request.status = "rejected";
    } else if (action === "fulfill") {
      const requester = byId("users", request.requesterId);
      const result = applyMovement(
        request.productId,
        "out",
        request.quantity,
        actor,
        "Fulfilled request #" + request.id + " for " + (requester ? requester.username : "user")
      );
      if (result.error) return result;
      request.status = "fulfilled";
    } else {
      return { error: "Unknown action." };
    }
    request.handledById = actor.id;
    save();
    return { request: request };
  }

  function cancelRequest(requestId, actor) {
    const request = byId("requests", requestId);
    if (!request || request.requesterId !== actor.id) return { error: "Request not found." };
    if (request.status !== "pending") return { error: "Only pending requests can be cancelled." };
    db.requests = db.requests.filter(function (r) {
      return r.id !== request.id;
    });
    save();
    return { ok: true };
  }

  load();

  return {
    ROLES: ROLES,
    STATUSES: STATUSES,
    reset: reset,
    byId: byId,
    categoryName: categoryName,
    isLowStock: isLowStock,
    stockValue: stockValue,
    productIcon: productIcon,
    searchProducts: searchProducts,
    metrics: metrics,
    login: login,
    register: register,
    currentUser: currentUser,
    logout: logout,
    createProduct: createProduct,
    updateProduct: updateProduct,
    deleteProduct: deleteProduct,
    uploadProductImage: uploadProductImage,
    applyMovement: applyMovement,
    movements: movements,
    categories: categories,
    createCategory: createCategory,
    productsInCategory: productsInCategory,
    users: users,
    createUser: createUser,
    setRole: setRole,
    toggleUser: toggleUser,
    updateProfile: updateProfile,
    requests: requests,
    createRequest: createRequest,
    handleRequest: handleRequest,
    cancelRequest: cancelRequest,
  };
})();
