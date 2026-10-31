document.addEventListener("DOMContentLoaded", async () => {
    const detail = document.getElementById("appDetail");
    const longDescription = document.getElementById("appLongDescription");

    const params = new URLSearchParams(window.location.search);
    const appId = params.get("id");

    function showError(message) {
        detail.innerHTML = "";

        const error = document.createElement("div");
        error.className = "detail-error";

        const title = document.createElement("h2");
        title.textContent = "Application not found";

        const description = document.createElement("p");
        description.textContent = message;

        const link = document.createElement("a");
        link.href = "./index.html#apps";
        link.className = "primary-button";
        link.textContent = "Back to library";

        error.append(title, description, link);
        detail.appendChild(error);
    }

    function createElement(tag, className, content) {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = content;
        return element;
    }

    if (!appId) {
        showError("No application ID was provided.");
        return;
    }

    try {
        const response = await fetch("./apps.json");

        if (!response.ok) {
            throw new Error("Unable to load the application catalog.");
        }

        const apps = await response.json();

        const app = apps.find(item => item.id === appId);

        if (!app) {
            showError("This application does not exist in the catalog.");
            return;
        }

        document.title = `${app.name} — Direct`;

        detail.innerHTML = "";

        const header = document.createElement("div");
        header.className = "detail-header";

        const icon = document.createElement("img");
        icon.className = "detail-icon";
        icon.src = app.icon || "./assets/logo.svg";
        icon.alt = `${app.name} icon`;

        icon.onerror = () => {
            icon.onerror = null;
            icon.src = "./assets/logo.svg";
        };

        const info = document.createElement("div");
        info.className = "detail-title";

        const category = createElement(
            "span",
            "app-category",
            app.category
        );

        const name = createElement("h1", "", app.name);

        const version = createElement(
            "p",
            "detail-version",
            app.version ? `Version ${app.version}` : "Application"
        );

        info.append(category, name, version);
        header.append(icon, info);

        const description = createElement(
            "p",
            "detail-description",
            app.description
        );

        const actions = document.createElement("div");
        actions.className = "detail-actions";

        const installButton = document.createElement("button");
        installButton.className = "install-button";
        installButton.type = "button";

        const manifestUrl = app.manifestUrl;

        if (typeof manifestUrl === "string" &&
            manifestUrl.startsWith("https://")) {

            installButton.textContent = "Install application ↗";

            installButton.addEventListener("click", () => {
                const installUrl =
                    `itms-services://?action=download-manifest&url=${encodeURIComponent(manifestUrl)}`;

                window.location.href = installUrl;
            });

        } else {
            installButton.textContent = "Installation unavailable";
            installButton.disabled = true;
        }

        actions.appendChild(installButton);

        const metadata = document.createElement("div");
        metadata.className = "detail-metadata";

        const categoryMeta = createElement(
            "div",
            "metadata-item",
            `Category: ${app.category}`
        );

        const versionMeta = createElement(
            "div",
            "metadata-item",
            `Version: ${app.version || "Unknown"}`
        );

        metadata.append(categoryMeta, versionMeta);

        detail.append(header, description, actions, metadata);

        longDescription.textContent =
            app.longDescription || app.description;

    } catch (error) {
        console.error(error);
        showError(error.message || "Something went wrong.");
    }
});
