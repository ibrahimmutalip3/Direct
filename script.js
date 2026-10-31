document.addEventListener("DOMContentLoaded", () => {
    const appsGrid = document.getElementById("appsGrid");
    const searchInput = document.getElementById("searchInput");
    const appCount = document.getElementById("appCount");
    const categoryButtons = document.querySelectorAll(".category");

    let apps = [];
    let activeCategory = "All";
    let searchQuery = "";

    // LOAD APPLICATIONS
    async function loadApps() {
        try {
            const response = await fetch("./apps.json");

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();

            if (!Array.isArray(data)) {
                throw new Error("Invalid apps.json format");
            }

            apps = data.filter(app =>
                app &&
                typeof app.name === "string" &&
                typeof app.description === "string" &&
                typeof app.category === "string"
            );

            renderApps();
        } catch (error) {
            console.error("Failed to load applications:", error);

            appsGrid.innerHTML = `
                <div class="empty-state">
                    <h3>Unable to load applications</h3>
                    <p>Please try refreshing the page.</p>
                </div>
            `;

            appCount.textContent = "Unavailable";
        }
    }

    // CREATE APPLICATION CARD
    function createAppCard(app, index) {
        const card = document.createElement("article");
        card.className = "app-card";
        card.style.animationDelay = `${Math.min(index * 60, 360)}ms`;

        const top = document.createElement("div");
        top.className = "app-card-top";

        const icon = document.createElement("img");
        icon.className = "app-icon";
        icon.src = app.icon || "./assets/logo.svg";
        icon.alt = `${app.name} icon`;
        icon.loading = "lazy";

        icon.onerror = () => {
            icon.onerror = null;
            icon.src = "./assets/logo.svg";
        };

        const category = document.createElement("span");
        category.className = "app-category";
        category.textContent = app.category;

        top.append(icon, category);

        const name = document.createElement("h3");
        name.textContent = app.name;

        const description = document.createElement("p");
        description.className = "app-description";
        description.textContent = app.description;

        const bottom = document.createElement("div");
        bottom.className = "app-card-bottom";

        const version = document.createElement("span");
        version.className = "app-version";
        version.textContent = app.version
            ? `Version ${app.version}`
            : "Application";

        const link = document.createElement("a");
        link.className = "app-link";
        link.textContent = "View app ↗";

        if (typeof app.id === "string" && /^[a-zA-Z0-9_-]+$/.test(app.id)) {
            link.href = `app.html?id=${encodeURIComponent(app.id)}`;
        } else {
            link.href = "#";
            link.setAttribute("aria-disabled", "true");
        }

        bottom.append(version, link);
        card.append(top, name, description, bottom);

        return card;
    }

    // RENDER APPLICATIONS
    function renderApps() {
        appsGrid.replaceChildren();

        const filteredApps = apps.filter(app => {
            const matchesCategory =
                activeCategory === "All" ||
                app.category.toLowerCase() === activeCategory.toLowerCase();

            const searchableText = [
                app.name,
                app.description,
                app.category
            ].join(" ").toLowerCase();

            const matchesSearch = searchableText.includes(
                searchQuery.toLowerCase()
            );

            return matchesCategory && matchesSearch;
        });

        appCount.textContent =
            `${filteredApps.length} ${filteredApps.length === 1 ? "app" : "apps"}`;

        if (filteredApps.length === 0) {
            const empty = document.createElement("div");
            empty.className = "empty-state";

            const title = document.createElement("h3");
            title.textContent = "No applications found";

            const description = document.createElement("p");
            description.textContent = "Try another search or category.";

            empty.append(title, description);
            appsGrid.appendChild(empty);
            return;
        }

        filteredApps.forEach((app, index) => {
            appsGrid.appendChild(createAppCard(app, index));
        });
    }

    // SEARCH
    searchInput.addEventListener("input", event => {
        searchQuery = event.target.value.trim();
        renderApps();
    });

    // CATEGORY FILTERS
    categoryButtons.forEach(button => {
        button.addEventListener("click", () => {
            categoryButtons.forEach(item => {
                item.classList.remove("active");
            });

            button.classList.add("active");
            activeCategory = button.dataset.category || "All";

            renderApps();
        });
    });

    // KEYBOARD SHORTCUT: CTRL/CMD + K
    document.addEventListener("keydown", event => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            searchInput.focus();
        }

        if (event.key === "Escape") {
            searchInput.blur();
        }
    });

    // INITIALIZE
    loadApps();
});
