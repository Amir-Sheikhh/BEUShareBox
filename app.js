const CONFIG = {
  storageKeys: {
    products: "beu-sharebox-products",
    profile: "beu-sharebox-profile",
    profiles: "beu-sharebox-profiles",
    theme: "beu-sharebox-theme"
  },
  limits: {
    productImageBytes: 200 * 1024,
    avatarBytes: 150 * 1024
  },
  timing: {
    removeAnimationMs: 220,
    filterAnimationMs: 140,
    toastDurationMs: 3000,
    searchDebounceMs: 120
  }
};

const DOM = {
  profileForm: document.getElementById("profile-form"),
  themeToggleBtn: document.getElementById("theme-toggle-btn"),
  profileSelect: document.getElementById("profile-select"),
  newProfileBtn: document.getElementById("new-profile-btn"),
  deleteProfileBtn: document.getElementById("delete-profile-btn"),
  usernameInput: document.getElementById("username"),
  avatarInput: document.getElementById("avatar"),
  bioInput: document.getElementById("bio"),
  profileError: document.getElementById("profile-error"),
  profileNameDisplay: document.getElementById("profile-name-display"),
  profileAvatarDisplay: document.getElementById("profile-avatar-display"),

  productForm: document.getElementById("product-form"),
  productLinkInput: document.getElementById("product-link"),
  autofillBtn: document.getElementById("autofill-btn"),
  titleInput: document.getElementById("title"),
  descriptionInput: document.getElementById("description"),
  priceInput: document.getElementById("price"),
  categoryInput: document.getElementById("category"),
  imageInput: document.getElementById("image"),
  formError: document.getElementById("form-error"),

  categoryFilter: document.getElementById("category-filter"),
  myProductsOnly: document.getElementById("my-products-only"),
  sortBy: document.getElementById("sort-by"),
  searchInput: document.getElementById("search"),
  exportBtn: document.getElementById("export-btn"),
  importFile: document.getElementById("import-file"),
  dataMessage: document.getElementById("data-message"),

  productCount: document.getElementById("product-count"),
  likesCount: document.getElementById("likes-count"),
  mostLikedProduct: document.getElementById("most-liked-product"),
  categoryDistribution: document.getElementById("category-distribution"),
  productList: document.getElementById("product-list"),

  modal: document.getElementById("product-modal"),
  modalClose: document.getElementById("modal-close"),
  modalTitle: document.getElementById("modal-title"),
  modalImage: document.getElementById("modal-image"),
  modalDescription: document.getElementById("modal-description"),
  modalPrice: document.getElementById("modal-price"),
  modalCategory: document.getElementById("modal-category"),
  modalOwner: document.getElementById("modal-owner"),
  modalLikes: document.getElementById("modal-likes"),
  modalSourceWrap: document.getElementById("modal-source-wrap"),
  modalSourceLink: document.getElementById("modal-source-link"),
  modalCreatedAt: document.getElementById("modal-created-at"),
  modalComments: document.getElementById("modal-comments"),

  toastContainer: document.getElementById("toast-container")
};

const Utils = {
  generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
  },

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  },

  formatPrice(value) {
    return Number(value).toFixed(2);
  },

  formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown";
    }
    return date.toLocaleString();
  },

  safeHttpUrl(value) {
    try {
      const parsed = new URL(String(value || "").trim());
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
      return "";
    } catch (error) {
      return "";
    }
  },

  debounce(fn, waitMs) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), waitMs);
    };
  }
};

const Storage = {
  loadJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return fallback;
      }
      const parsed = JSON.parse(raw);
      return parsed ?? fallback;
    } catch (error) {
      return fallback;
    }
  },

  saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

const Normalizers = {
  profile(rawProfile) {
    if (!rawProfile || typeof rawProfile !== "object") {
      return null;
    }

    return {
      id: String(rawProfile.id || "").trim(),
      username: String(rawProfile.username || "").trim(),
      bio: String(rawProfile.bio || "").trim(),
      avatarData: typeof rawProfile.avatarData === "string" ? rawProfile.avatarData : "",
      createdAt: rawProfile.createdAt || new Date().toISOString()
    };
  },

  product(rawProduct) {
    if (!rawProduct || typeof rawProduct !== "object") {
      return null;
    }

    const normalized = {
      id: String(rawProduct.id || Utils.generateId()),
      title: String(rawProduct.title || "").trim(),
      description: String(rawProduct.description || "").trim(),
      price: Number(rawProduct.price) || 0,
      category: String(rawProduct.category || "other"),
      likes: Number(rawProduct.likes) || 0,
      comments: Array.isArray(rawProduct.comments)
        ? rawProduct.comments.map((comment) => String(comment))
        : [],
      imageData: typeof rawProduct.imageData === "string" ? rawProduct.imageData : "",
      imageUrl: typeof rawProduct.imageUrl === "string" ? rawProduct.imageUrl : "",
      sourceUrl: typeof rawProduct.sourceUrl === "string" ? rawProduct.sourceUrl : "",
      ownerUsername: String(rawProduct.ownerUsername || "").trim(),
      createdAt: rawProduct.createdAt || new Date().toISOString()
    };

    if (!normalized.title || !normalized.description) {
      return null;
    }

    return normalized;
  }
};

const FileService = {
  readImageAsBase64(file, maxSizeBytes, label) {
    return new Promise((resolve) => {
      if (!file) {
        resolve({ ok: true, base64: "" });
        return;
      }

      if (!file.type.startsWith("image/")) {
        resolve({ ok: false, message: `${label} must be an image file.` });
        return;
      }

      if (file.size > maxSizeBytes) {
        resolve({ ok: false, message: `${label} too large. Please choose a smaller file.` });
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve({ ok: true, base64: String(reader.result || "") });
      reader.onerror = () => resolve({ ok: false, message: `Unable to read ${label.toLowerCase()} file.` });
      reader.readAsDataURL(file);
    });
  }
};

const LinkService = {
  async fetchProductMetadata(rawUrl) {
    const cleanedUrl = this.normalizeUrl(rawUrl);
    if (!cleanedUrl) {
      return { ok: false, message: "Please enter a valid product URL." };
    }

    const primary = await this.fetchFromMicrolink(cleanedUrl);
    if (primary.ok) {
      return primary;
    }

    const fallback = await this.fetchFromJinaReader(cleanedUrl);
    if (fallback.ok) {
      return fallback;
    }

    return { ok: false, message: "Could not fetch product details from this link." };
  },

  normalizeUrl(value) {
    const trimmed = String(value || "").trim();
    if (!trimmed) {
      return "";
    }

    try {
      const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
      return parsed.href;
    } catch (error) {
      return "";
    }
  },

  async fetchFromMicrolink(url) {
    try {
      const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&meta=true&screenshot=false`);
      if (!response.ok) {
        return { ok: false };
      }

      const payload = await response.json();
      if (payload.status !== "success" || !payload.data) {
        return { ok: false };
      }

      const data = payload.data;
      const title = String(data.title || "").trim();
      const description = String(data.description || "").trim();
      const imageUrl = data.image?.url || data.logo?.url || "";
      const detectedPrice = this.extractPrice(`${title} ${description}`);

      return {
        ok: Boolean(title || description || imageUrl),
        data: {
          title,
          description,
          imageUrl,
          price: detectedPrice,
          category: this.detectCategory(`${title} ${description}`),
          sourceUrl: url
        }
      };
    } catch (error) {
      return { ok: false };
    }
  },

  async fetchFromJinaReader(url) {
    try {
      const response = await fetch(`https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`);
      if (!response.ok) {
        return { ok: false };
      }

      const text = await response.text();
      const title = this.extractTitleFromText(text);
      const description = this.extractDescriptionFromText(text);
      const detectedPrice = this.extractPrice(text);

      return {
        ok: Boolean(title || description),
        data: {
          title,
          description,
          imageUrl: "",
          price: detectedPrice,
          category: this.detectCategory(`${title} ${description}`),
          sourceUrl: url
        }
      };
    } catch (error) {
      return { ok: false };
    }
  },

  extractTitleFromText(text) {
    const line = text.split("\n").find((row) => row.trim().length > 10 && row.trim().length < 120);
    return line ? line.trim() : "";
  },

  extractDescriptionFromText(text) {
    const line = text
      .split("\n")
      .map((row) => row.trim())
      .find((row) => row.length > 40 && row.length < 320);
    return line || "";
  },

  detectCategory(text) {
    const value = String(text || "").toLowerCase();

    if (/phone|laptop|earbud|camera|monitor|gaming|tablet|electronics/.test(value)) {
      return "electronics";
    }
    if (/shirt|shoe|dress|fashion|jeans|jacket|watch/.test(value)) {
      return "fashion";
    }
    if (/home|kitchen|furniture|decor|bed|sofa|lamp/.test(value)) {
      return "home";
    }
    if (/beauty|skin|cosmetic|makeup|perfume|hair/.test(value)) {
      return "beauty";
    }
    if (/sport|fitness|gym|yoga|cycling|running/.test(value)) {
      return "sports";
    }
    return "other";
  },

  extractPrice(text) {
    const source = String(text || "");
    const match = source.match(/(?:\$|USD|EUR|BDT|INR|Tk\.?)\s?([0-9]+(?:[.,][0-9]{1,2})?)/i);
    if (!match) {
      return "";
    }
    return match[1].replace(",", ".");
  }
};

const State = {
  data: {
    profile: null,
    profiles: [],
    products: [],
    filters: {
      category: "all",
      searchTerm: "",
      sortBy: "newest",
      myProductsOnly: false
    },
    settings: {
      theme: "light"
    },
    ui: {
      selectedProductId: null,
      filterTimerId: null,
      renderQueued: false,
      prefetchedImageUrl: "",
      autofillInProgress: false
    }
  },

  emptyProfile() {
    return {
      id: Utils.generateId(),
      username: "",
      bio: "",
      avatarData: "",
      createdAt: new Date().toISOString()
    };
  },

  init() {
    const rawProfiles = Storage.loadJson(CONFIG.storageKeys.profiles, []);
    this.data.profiles = Array.isArray(rawProfiles)
      ? rawProfiles.map(Normalizers.profile).filter(Boolean)
      : [];

    const rawCurrentProfile = Storage.loadJson(CONFIG.storageKeys.profile, {});
    const normalizedCurrent = Normalizers.profile(rawCurrentProfile);

    if (normalizedCurrent && normalizedCurrent.id) {
      const matchedProfile = this.data.profiles.find((item) => item.id === normalizedCurrent.id);
      this.data.profile = matchedProfile ? { ...matchedProfile } : normalizedCurrent;
    } else if (normalizedCurrent && normalizedCurrent.username) {
      const matchedByName = this.data.profiles.find((item) => item.username === normalizedCurrent.username);
      if (matchedByName) {
        this.data.profile = { ...matchedByName };
      } else {
        normalizedCurrent.id = Utils.generateId();
        this.data.profile = normalizedCurrent;
        this.data.profiles.unshift({ ...normalizedCurrent });
      }
    } else {
      this.data.profile = this.emptyProfile();
    }

    if (this.data.profile.username && !this.data.profiles.some((item) => item.id === this.data.profile.id)) {
      this.data.profiles.unshift({ ...this.data.profile });
    }

    const rawProducts = Storage.loadJson(CONFIG.storageKeys.products, []);
    this.data.products = Array.isArray(rawProducts)
      ? rawProducts.map(Normalizers.product).filter(Boolean)
      : [];

    const savedTheme = Storage.loadJson(CONFIG.storageKeys.theme, "light");
    this.data.settings.theme = savedTheme === "dark" ? "dark" : "light";

    this.persistProfile();
    this.persistProfiles();
  },

  persistProfile() {
    Storage.saveJson(CONFIG.storageKeys.profile, this.data.profile);
  },

  persistProfiles() {
    Storage.saveJson(CONFIG.storageKeys.profiles, this.data.profiles);
  },

  persistProducts() {
    Storage.saveJson(CONFIG.storageKeys.products, this.data.products);
  },

  persistTheme() {
    Storage.saveJson(CONFIG.storageKeys.theme, this.data.settings.theme);
  }
};

const Selectors = {
  filteredAndSortedProducts() {
    const { products, filters, profile } = State.data;
    const query = filters.searchTerm.trim().toLowerCase();

    const filtered = products
      .filter((product) => (filters.category === "all" ? true : product.category === filters.category))
      .filter((product) => {
        if (!query) {
          return true;
        }
        const haystack = `${product.title} ${product.description}`.toLowerCase();
        return haystack.includes(query);
      })
      .filter((product) => {
        if (!filters.myProductsOnly) {
          return true;
        }
        if (!profile.username) {
          return false;
        }
        return product.ownerUsername === profile.username;
      });

    return [...filtered].sort((a, b) => {
      if (filters.sortBy === "price-asc") {
        return a.price - b.price;
      }
      if (filters.sortBy === "price-desc") {
        return b.price - a.price;
      }
      if (filters.sortBy === "likes-desc") {
        return b.likes - a.likes;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  },

  dashboardStats() {
    const products = State.data.products;

    const totalLikes = products.reduce((sum, product) => sum + product.likes, 0);

    const mostLiked = products.reduce((best, product) => {
      if (!best || product.likes > best.likes) {
        return product;
      }
      return best;
    }, null);

    const categoryCounts = products.reduce((acc, product) => {
      const category = product.category || "other";
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return {
      totalProducts: products.length,
      totalLikes,
      mostLiked,
      categoryCounts
    };
  }
};

const Messages = {
  setFormError(message) {
    DOM.formError.textContent = message;
  },

  setProfileError(message) {
    DOM.profileError.textContent = message;
  },

  setDataMessage(message) {
    DOM.dataMessage.textContent = message;
  },

  clearAll() {
    DOM.formError.textContent = "";
    DOM.profileError.textContent = "";
  }
};

const Toast = {
  show(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-hide");
      setTimeout(() => toast.remove(), 220);
    }, CONFIG.timing.toastDurationMs);
  }
};

const Modal = {
  open(productId) {
    const product = State.data.products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    State.data.ui.selectedProductId = productId;
    DOM.modalTitle.textContent = product.title;
    DOM.modalDescription.textContent = product.description;
    DOM.modalPrice.textContent = `$${Utils.formatPrice(product.price)}`;
    DOM.modalCategory.textContent = product.category;
    DOM.modalOwner.textContent = product.ownerUsername || "Unknown";
    DOM.modalLikes.textContent = String(product.likes);
    DOM.modalCreatedAt.textContent = Utils.formatDate(product.createdAt);
    const sourceUrl = Utils.safeHttpUrl(product.sourceUrl);
    if (sourceUrl) {
      DOM.modalSourceLink.href = sourceUrl;
      DOM.modalSourceWrap.classList.remove("hidden");
    } else {
      DOM.modalSourceLink.href = "#";
      DOM.modalSourceWrap.classList.add("hidden");
    }

    const imageSource = product.imageData || product.imageUrl;
    if (imageSource) {
      DOM.modalImage.src = imageSource;
      DOM.modalImage.alt = `${product.title} preview`;
      DOM.modalImage.classList.remove("hidden");
    } else {
      DOM.modalImage.src = "";
      DOM.modalImage.alt = "";
      DOM.modalImage.classList.add("hidden");
    }

    DOM.modalComments.innerHTML = product.comments.length
      ? product.comments.map((comment) => `<li>${Utils.escapeHtml(comment)}</li>`).join("")
      : "<li>No comments yet.</li>";

    DOM.modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
  },

  close() {
    DOM.modal.classList.add("hidden");
    document.body.classList.remove("modal-open");
    State.data.ui.selectedProductId = null;
  }
};

const Renderer = {
  queueRender() {
    if (State.data.ui.renderQueued) {
      return;
    }

    State.data.ui.renderQueued = true;
    requestAnimationFrame(() => {
      State.data.ui.renderQueued = false;
      this.renderTheme();
      this.renderProfile();
      this.renderDashboard();
      this.renderProducts();
    });
  },

  renderTheme() {
    const theme = State.data.settings.theme;
    document.documentElement.setAttribute("data-theme", theme);
    DOM.themeToggleBtn.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
  },

  renderProfile() {
    const { profile, profiles } = State.data;

    DOM.usernameInput.value = profile.username;
    DOM.bioInput.value = profile.bio || "";
    DOM.profileNameDisplay.textContent = profile.username || "Guest";

    if (profile.avatarData) {
      DOM.profileAvatarDisplay.src = profile.avatarData;
      DOM.profileAvatarDisplay.classList.remove("hidden");
    } else {
      DOM.profileAvatarDisplay.src = "";
      DOM.profileAvatarDisplay.classList.add("hidden");
    }

    const profileOptions = profiles
      .map(
        (item) => `<option value="${item.id}">${Utils.escapeHtml(item.username || "Unnamed profile")}</option>`
      )
      .join("");

    DOM.profileSelect.innerHTML = `
      <option value="">New profile</option>
      ${profileOptions}
    `;

    if (profile.username && profile.id) {
      DOM.profileSelect.value = profile.id;
    } else {
      DOM.profileSelect.value = "";
    }
  },

  renderDashboard() {
    const stats = Selectors.dashboardStats();
    DOM.productCount.textContent = String(stats.totalProducts);
    DOM.likesCount.textContent = String(stats.totalLikes);
    DOM.mostLikedProduct.textContent = stats.mostLiked
      ? `${stats.mostLiked.title} (${stats.mostLiked.likes})`
      : "N/A";

    const entries = Object.entries(stats.categoryCounts);
    DOM.categoryDistribution.innerHTML = entries.length
      ? entries.map(([name, count]) => `<li>${Utils.escapeHtml(name)}: ${count}</li>`).join("")
      : "<li>No data available.</li>";
  },

  renderProducts() {
    const products = Selectors.filteredAndSortedProducts();

    if (!products.length) {
      DOM.productList.innerHTML = `
        <h2 id="product-list-heading">Products</h2>
        <p class="empty-state">No products found. Try adjusting filters or add a new product.</p>
      `;
      return;
    }

    const cards = products.map((product) => this.productCardMarkup(product)).join("");
    DOM.productList.innerHTML = `
      <h2 id="product-list-heading">Products</h2>
      ${cards}
    `;
  },

  productCardMarkup(product) {
    const imageSource = product.imageData || product.imageUrl;
    const image = imageSource
      ? `<img class="product-image" src="${imageSource}" alt="${Utils.escapeHtml(product.title)} preview" />`
      : "";

    const owner = product.ownerUsername
      ? `<p class="meta"><strong>Owner:</strong> ${Utils.escapeHtml(product.ownerUsername)}</p>`
      : "";
    const safeSourceUrl = Utils.safeHttpUrl(product.sourceUrl);
    const source = safeSourceUrl
      ? `<p class="meta"><a class="source-link" href="${safeSourceUrl}" target="_blank" rel="noopener noreferrer">Open source product</a></p>`
      : "";

    const comments = product.comments.length
      ? product.comments.map((comment) => `<li>${Utils.escapeHtml(comment)}</li>`).join("")
      : "<li>No comments yet.</li>";

    return `
      <article class="product-card card-enter" data-id="${product.id}" aria-label="Product card">
        <h3>${Utils.escapeHtml(product.title)}</h3>
        ${image}
        <p>${Utils.escapeHtml(product.description)}</p>
        <p><strong>Price:</strong> $${Utils.formatPrice(product.price)}</p>
        <p><strong>Category:</strong> ${Utils.escapeHtml(product.category)}</p>
        ${owner}
        ${source}
        <p class="meta"><strong>Added:</strong> ${Utils.formatDate(product.createdAt)}</p>

        <div class="card-actions">
          <button type="button" class="like-btn" data-id="${product.id}">Like (${product.likes})</button>
          <button type="button" class="delete-btn" data-id="${product.id}">Delete</button>
        </div>

        <form class="comment-form" data-id="${product.id}">
          <label class="sr-only" for="comment-${product.id}">Comment</label>
          <input id="comment-${product.id}" name="comment" type="text" maxlength="200" placeholder="Write a comment" required />
          <button type="submit">Comment</button>
        </form>

        <ul class="comment-list">${comments}</ul>
      </article>
    `;
  }
};

const Effects = {
  animateFilterTransition() {
    if (State.data.ui.filterTimerId) {
      clearTimeout(State.data.ui.filterTimerId);
      State.data.ui.filterTimerId = null;
    }

    DOM.productList.classList.remove("filter-in");
    DOM.productList.classList.add("filter-out");

    State.data.ui.filterTimerId = setTimeout(() => {
      Renderer.queueRender();
      DOM.productList.classList.remove("filter-out");
      DOM.productList.classList.add("filter-in");

      State.data.ui.filterTimerId = setTimeout(() => {
        DOM.productList.classList.remove("filter-in");
        State.data.ui.filterTimerId = null;
      }, CONFIG.timing.filterAnimationMs);
    }, CONFIG.timing.filterAnimationMs);
  }
};

const DataPort = {
  exportJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: State.data.profile,
      profiles: State.data.profiles,
      products: State.data.products
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `beusharebox-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    Messages.setDataMessage("Data exported successfully.");
  },

  async importJson(file) {
    const text = await file.text();
    const parsed = JSON.parse(text);

    const importedProducts = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.products)
        ? parsed.products
        : [];

    const mergeProductsResult = this.mergeProducts(importedProducts);

    const importedProfiles = Array.isArray(parsed?.profiles)
      ? parsed.profiles
      : parsed?.profile
        ? [parsed.profile]
        : [];

    const mergeProfilesResult = this.mergeProfiles(importedProfiles);

    if (mergeProductsResult.added > 0) {
      State.persistProducts();
    }

    if (mergeProfilesResult.added > 0) {
      State.persistProfiles();
      if (!State.data.profile.username && State.data.profiles.length > 0) {
        State.data.profile = { ...State.data.profiles[0] };
        State.persistProfile();
      }
    }

    Renderer.queueRender();
    Messages.setDataMessage(
      `Import complete. Products added ${mergeProductsResult.added}, skipped ${mergeProductsResult.skipped}. Profiles added ${mergeProfilesResult.added}, skipped ${mergeProfilesResult.skipped}.`
    );
  },

  mergeProducts(importedProducts) {
    const existingIds = new Set(State.data.products.map((product) => product.id));
    let added = 0;
    let skipped = 0;

    importedProducts.forEach((raw) => {
      const product = Normalizers.product(raw);
      if (!product) {
        skipped += 1;
        return;
      }

      if (existingIds.has(product.id)) {
        product.id = this.uniqueId(existingIds);
      }

      existingIds.add(product.id);
      State.data.products.push(product);
      added += 1;
    });

    return { added, skipped };
  },

  mergeProfiles(importedProfiles) {
    const existingIds = new Set(State.data.profiles.map((profile) => profile.id));
    const existingNames = new Set(State.data.profiles.map((profile) => profile.username.toLowerCase()));
    let added = 0;
    let skipped = 0;

    importedProfiles.forEach((raw) => {
      const profile = Normalizers.profile(raw);
      if (!profile || !profile.username) {
        skipped += 1;
        return;
      }

      if (!profile.id) {
        profile.id = Utils.generateId();
      }

      if (existingIds.has(profile.id) || existingNames.has(profile.username.toLowerCase())) {
        skipped += 1;
        return;
      }

      State.data.profiles.push(profile);
      existingIds.add(profile.id);
      existingNames.add(profile.username.toLowerCase());
      added += 1;
    });

    return { added, skipped };
  },

  uniqueId(existingIds) {
    let id = Utils.generateId();
    while (existingIds.has(id)) {
      id = Utils.generateId();
    }
    return id;
  }
};

const Validators = {
  productInput({ title, description, price, category }) {
    if (!title) {
      return { ok: false, message: "Title is required." };
    }
    if (title.length < 2) {
      return { ok: false, message: "Title must be at least 2 characters." };
    }
    if (!description) {
      return { ok: false, message: "Description is required." };
    }
    if (description.length < 5) {
      return { ok: false, message: "Description must be at least 5 characters." };
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return { ok: false, message: "Price must be greater than 0." };
    }

    if (!category) {
      return { ok: false, message: "Please select a category." };
    }

    return { ok: true };
  }
};

const Actions = {
  toggleTheme() {
    State.data.settings.theme = State.data.settings.theme === "dark" ? "light" : "dark";
    State.persistTheme();
    Renderer.queueRender();
  },

  async saveProfile() {
    Messages.setProfileError("");

    const username = DOM.usernameInput.value.trim();
    const bio = DOM.bioInput.value.trim();

    if (!username) {
      Messages.setProfileError("Username is required.");
      return;
    }

    const avatarFile = DOM.avatarInput.files[0] || null;
    const avatarResult = await FileService.readImageAsBase64(
      avatarFile,
      CONFIG.limits.avatarBytes,
      "Avatar"
    );

    if (!avatarResult.ok) {
      Messages.setProfileError(avatarResult.message);
      return;
    }

    const currentProfile = State.data.profile || State.emptyProfile();
    const nextProfile = {
      id: currentProfile.id || Utils.generateId(),
      username,
      bio,
      avatarData: avatarFile ? avatarResult.base64 : currentProfile.avatarData,
      createdAt: currentProfile.createdAt || new Date().toISOString()
    };

    State.data.profile = nextProfile;

    const existingIndex = State.data.profiles.findIndex((item) => item.id === nextProfile.id);
    if (existingIndex >= 0) {
      State.data.profiles[existingIndex] = { ...nextProfile };
    } else {
      State.data.profiles.unshift({ ...nextProfile });
    }

    State.persistProfile();
    State.persistProfiles();
    Messages.setDataMessage("Profile saved.");
    Renderer.queueRender();
    Toast.show("Profile saved.");
  },

  switchProfile(profileId) {
    if (!profileId) {
      State.data.profile = State.emptyProfile();
      State.persistProfile();
      Renderer.queueRender();
      return;
    }

    const targetProfile = State.data.profiles.find((item) => item.id === profileId);
    if (!targetProfile) {
      return;
    }

    State.data.profile = { ...targetProfile };
    State.persistProfile();
    Messages.setDataMessage(`Switched to ${targetProfile.username}.`);
    Renderer.queueRender();
  },

  createNewProfile() {
    Messages.setProfileError("");
    State.data.profile = State.emptyProfile();
    State.persistProfile();
    Renderer.queueRender();
    Messages.setDataMessage("Ready to create a new profile.");
  },

  deleteCurrentProfile() {
    const current = State.data.profile;
    if (!current?.id || !current.username) {
      Messages.setDataMessage("No saved profile selected.");
      return;
    }

    const confirmed = window.confirm(`Delete profile '${current.username}'?`);
    if (!confirmed) {
      return;
    }

    State.data.profiles = State.data.profiles.filter((item) => item.id !== current.id);

    if (State.data.profiles.length > 0) {
      State.data.profile = { ...State.data.profiles[0] };
    } else {
      State.data.profile = State.emptyProfile();
    }

    State.persistProfiles();
    State.persistProfile();
    Renderer.queueRender();
    Toast.show("Profile deleted.");
  },

  async autofillProductFromLink() {
    Messages.setFormError("");
    Messages.setDataMessage("");

    const urlValue = DOM.productLinkInput.value.trim();
    if (!urlValue) {
      Messages.setFormError("Paste a product URL first.");
      return;
    }

    if (State.data.ui.autofillInProgress) {
      return;
    }

    State.data.ui.autofillInProgress = true;
    DOM.autofillBtn.disabled = true;
    DOM.autofillBtn.textContent = "Fetching...";

    try {
      const result = await LinkService.fetchProductMetadata(urlValue);
      if (!result.ok || !result.data) {
        Messages.setFormError(result.message || "Unable to auto fill from this link.");
        return;
      }

      const metadata = result.data;
      DOM.titleInput.value = metadata.title || DOM.titleInput.value;
      DOM.descriptionInput.value = metadata.description || DOM.descriptionInput.value;
      if (metadata.price && !DOM.priceInput.value) {
        DOM.priceInput.value = metadata.price;
      }
      DOM.categoryInput.value = metadata.category || DOM.categoryInput.value;

      State.data.ui.prefetchedImageUrl = metadata.imageUrl || "";
      DOM.productLinkInput.value = metadata.sourceUrl || urlValue;
      Messages.setDataMessage("Product fields auto-filled from link.");
      Toast.show("Fields auto-filled.");
    } finally {
      State.data.ui.autofillInProgress = false;
      DOM.autofillBtn.disabled = false;
      DOM.autofillBtn.textContent = "Auto Fill";
    }
  },

  async addProduct() {
    Messages.setFormError("");

    if (!State.data.profile.username) {
      Messages.setFormError("Set your username in User Profile before adding products.");
      return;
    }

    const input = {
      sourceUrl: DOM.productLinkInput.value.trim(),
      title: DOM.titleInput.value.trim(),
      description: DOM.descriptionInput.value.trim(),
      price: DOM.priceInput.value,
      category: DOM.categoryInput.value,
      imageFile: DOM.imageInput.files[0] || null
    };

    const validation = Validators.productInput(input);
    if (!validation.ok) {
      Messages.setFormError(validation.message);
      return;
    }

    const imageResult = await FileService.readImageAsBase64(
      input.imageFile,
      CONFIG.limits.productImageBytes,
      "Image"
    );

    if (!imageResult.ok) {
      Messages.setFormError(imageResult.message);
      return;
    }

    const product = {
      id: Utils.generateId(),
      title: input.title,
      description: input.description,
      price: Number(input.price),
      category: input.category,
      likes: 0,
      comments: [],
      imageData: imageResult.base64,
      imageUrl: imageResult.base64 ? "" : State.data.ui.prefetchedImageUrl,
      sourceUrl: input.sourceUrl,
      ownerUsername: State.data.profile.username,
      createdAt: new Date().toISOString()
    };

    State.data.products.unshift(product);
    State.persistProducts();
    DOM.productForm.reset();
    State.data.ui.prefetchedImageUrl = "";
    Renderer.queueRender();
    Toast.show("Product added.");
  },

  likeProduct(productId) {
    const product = State.data.products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    product.likes += 1;
    State.persistProducts();
    Renderer.queueRender();
    Toast.show("Product liked.");
  },

  deleteProduct(productId) {
    const confirmed = window.confirm("Are you sure you want to delete this product?");
    if (!confirmed) {
      return;
    }

    const card = DOM.productList.querySelector(`article[data-id="${productId}"]`);
    if (!card) {
      State.data.products = State.data.products.filter((item) => item.id !== productId);
      State.persistProducts();
      Renderer.queueRender();
      Toast.show("Product deleted.");
      return;
    }

    card.classList.add("card-removing");
    setTimeout(() => {
      State.data.products = State.data.products.filter((item) => item.id !== productId);
      if (State.data.ui.selectedProductId === productId) {
        Modal.close();
      }
      State.persistProducts();
      Renderer.queueRender();
      Toast.show("Product deleted.");
    }, CONFIG.timing.removeAnimationMs);
  },

  addComment(productId, commentText) {
    const product = State.data.products.find((item) => item.id === productId);
    if (!product) {
      return;
    }

    product.comments.push(commentText);
    State.persistProducts();
    Renderer.queueRender();
  }
};

const Handlers = {
  onThemeToggle() {
    Actions.toggleTheme();
  },

  async onProfileSubmit(event) {
    event.preventDefault();
    await Actions.saveProfile();
  },

  onProfileSelectChange(event) {
    Actions.switchProfile(event.target.value);
  },

  onNewProfileClick() {
    Actions.createNewProfile();
  },

  onDeleteProfileClick() {
    Actions.deleteCurrentProfile();
  },

  async onAutofillClick() {
    await Actions.autofillProductFromLink();
  },

  onProductLinkPaste: Utils.debounce(async () => {
    await Actions.autofillProductFromLink();
  }, 250),

  async onProductSubmit(event) {
    event.preventDefault();
    await Actions.addProduct();
  },

  onFilterChange() {
    State.data.filters.category = DOM.categoryFilter.value;
    Effects.animateFilterTransition();
  },

  onSortChange() {
    State.data.filters.sortBy = DOM.sortBy.value;
    Effects.animateFilterTransition();
  },

  onMyProductsToggle() {
    State.data.filters.myProductsOnly = DOM.myProductsOnly.checked;
    Effects.animateFilterTransition();
  },

  onSearchInput: Utils.debounce(() => {
    State.data.filters.searchTerm = DOM.searchInput.value;
    Effects.animateFilterTransition();
  }, CONFIG.timing.searchDebounceMs),

  onProductListClick(event) {
    const likeButton = event.target.closest(".like-btn");
    if (likeButton) {
      Actions.likeProduct(likeButton.dataset.id);
      return;
    }

    const deleteButton = event.target.closest(".delete-btn");
    if (deleteButton) {
      Actions.deleteProduct(deleteButton.dataset.id);
      return;
    }

    if (event.target.closest(".source-link")) {
      return;
    }

    if (event.target.closest(".comment-form")) {
      return;
    }

    const card = event.target.closest("article[data-id]");
    if (card) {
      Modal.open(card.dataset.id);
    }
  },

  onProductListSubmit(event) {
    const commentForm = event.target.closest(".comment-form");
    if (!commentForm) {
      return;
    }

    event.preventDefault();
    const input = commentForm.querySelector("input[name='comment']");
    const commentText = input.value.trim();
    if (!commentText) {
      return;
    }

    Actions.addComment(commentForm.dataset.id, commentText);
  },

  onModalClick(event) {
    if (event.target.dataset.modalClose === "overlay") {
      Modal.close();
    }
  },

  onEscapeClose(event) {
    if (event.key === "Escape" && !DOM.modal.classList.contains("hidden")) {
      Modal.close();
    }
  },

  onExportClick() {
    DataPort.exportJson();
  },

  async onImportChange(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    try {
      await DataPort.importJson(file);
    } catch (error) {
      Messages.setDataMessage("Invalid JSON file. Import failed.");
    }
  }
};

const Events = {
  bind() {
    DOM.themeToggleBtn.addEventListener("click", Handlers.onThemeToggle);
    DOM.profileForm.addEventListener("submit", Handlers.onProfileSubmit);
    DOM.profileSelect.addEventListener("change", Handlers.onProfileSelectChange);
    DOM.newProfileBtn.addEventListener("click", Handlers.onNewProfileClick);
    DOM.deleteProfileBtn.addEventListener("click", Handlers.onDeleteProfileClick);

    DOM.productForm.addEventListener("submit", Handlers.onProductSubmit);
    DOM.autofillBtn.addEventListener("click", Handlers.onAutofillClick);
    DOM.productLinkInput.addEventListener("paste", Handlers.onProductLinkPaste);

    DOM.categoryFilter.addEventListener("change", Handlers.onFilterChange);
    DOM.sortBy.addEventListener("change", Handlers.onSortChange);
    DOM.myProductsOnly.addEventListener("change", Handlers.onMyProductsToggle);
    DOM.searchInput.addEventListener("input", Handlers.onSearchInput);

    DOM.productList.addEventListener("click", Handlers.onProductListClick);
    DOM.productList.addEventListener("submit", Handlers.onProductListSubmit);

    DOM.exportBtn.addEventListener("click", Handlers.onExportClick);
    DOM.importFile.addEventListener("change", Handlers.onImportChange);

    DOM.modal.addEventListener("click", Handlers.onModalClick);
    DOM.modalClose.addEventListener("click", () => Modal.close());
    document.addEventListener("keydown", Handlers.onEscapeClose);
  }
};

function init() {
  State.init();
  Events.bind();
  Messages.clearAll();
  Renderer.queueRender();
}

init();
