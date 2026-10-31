
document.addEventListener("DOMContentLoaded", async () => {
    const appsGrid = document.getElementById("appsGrid");
    const searchInput = document.getElementById("searchInput");
    const appCount = document.getElementById("appCount");
    const sortSelect = document.getElementById("sortSelect");

    if (!appsGrid) return;

    let apps = [];
    let activeCategory = "All";
    let searchQuery = "";
    let sortMode = "default";

    try {
        const response = await fetch("./apps.json");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        apps = await response.json();

        if (!Array.isArray(apps)) {
            throw new Error("Invalid apps.json format");
        }

        renderApps();
    } catch (error) {
        console.error("Direct:", error);

        appsGrid.innerHTML = `
            <p class="apps-error">
                Unable to load applications. Please try again later.
            </p>
        `;
    }

    function compareVersions(a, b) {
        const first = String(a || "0").split(".").map(Number);
        const second = String(b || "0").split(".").map(Number);

        for (let i = 0; i < Math.max(first.length, second.length); i++) {
            const x = first[i] || 0;
            const y = second[i] || 0;

            if (x !== y) return y - x;
        }

        return 0;
    }

    function getFilteredApps() {
        let result = apps.filter(app => {
            const categoryMatch =
                activeCategory === "All" ||
                app.category === activeCategory;

            const query = searchQuery.toLowerCase();

            const searchMatch = [
                app.name,
                app.description,
                app.category
            ].some(value =>
                String(value || "").toLowerCase().includes(query)
            );

            return categoryMatch && searchMatch;
        });

        switch (sortMode) {
            case "name":
                result.sort((a, b) =>
                    String(a.name || "").localeCompare(
                        String(b.name || "")
                    )
                );
                break;

            case "newest":
                result.sort((a, b) =>
                    new Date(b.dateAdded || 0) -
                    new Date(a.dateAdded || 0)
                );
                break;

            case "version":
                result.sort((a, b) =>
                    compareVersions(a.version, b.version)
                );
                break;
        }

        return result;
    }

    function renderApps() {
        const filteredApps = getFilteredApps();

        appsGrid.innerHTML = "";

        if (appCount) {
            appCount.textContent = filteredApps.length;
        }

        if (filteredApps.length === 0) {
            appsGrid.innerHTML = `
                <div class="empty-state">
                    <h3>No applications found</h3>
                    <p>Try another search or category.</p>
                </div>
            `;
            return;
        }

        filteredApps.forEach(app => {
            const isProfile = app.type === "profile";

            const card = document.createElement("a");

            card.className = isProfile
                ? "app-card profile-card"
                : "app-card";

            card.href = isProfile
                ? app.profileUrl
                : `./app.html?id=${encodeURIComponent(app.id)}`;

            if (isProfile) {
                card.setAttribute("aria-label", `Download ${app.name} profile`);
            }

            const icon = document.createElement("img");
            icon.className = "app-icon";
            icon.src = app.icon || "./assets/logo.svg";
            icon.alt = "";
            icon.loading = "lazy";

            icon.onerror = () => {
                icon.src = "./assets/logo.svg";
            };

            const content = document.createElement("div");
            content.className = "app-card-content";

            const name = document.createElement("h3");
            name.className = "app-card-name";
            name.textContent = app.name || "Unnamed app";

            const description = document.createElement("p");
            description.className = "app-card-description";
            description.textContent = app.description || "";

            const metadata = document.createElement("div");
            metadata.className = "app-card-meta";

            const category = document.createElement("span");
            category.textContent = app.category || "Other";

            const version = document.createElement("span");
            version.textContent = isProfile
                ? "DNS Profile"
                : `v${app.version || "1.0.0"}`;

            metadata.append(category, version);
            content.append(name, description, metadata);
            card.append(icon, content);

            if (isProfile) {
                card.addEventListener("click", event => {
                    if (!app.profileUrl) {
                        event.preventDefault();
                        return;
                    }
                });
            }

            appsGrid.appendChild(card);
        });
    }

    if (searchInput) {
        searchInput.addEventListener("input", event => {
            searchQuery = event.target.value.trim();
            renderApps();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", event => {
            sortMode = event.target.value;
            renderApps();
        });
    }

    document.querySelectorAll("[data-category]").forEach(button => {
        button.addEventListener("click", () => {
            activeCategory = button.dataset.category;

            document.querySelectorAll("[data-category]").forEach(item => {
                item.classList.toggle("active", item === button);
            });

            renderApps();
        });
    });

    document.addEventListener("keydown", event => {
        if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "k"
        ) {
            event.preventDefault();
            searchInput?.focus();
        }
    });
});
