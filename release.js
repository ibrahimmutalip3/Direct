document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(location.search);
    const appId = params.get("id");

    if (!appId) return;

    const container =
        document.querySelector(".app-detail-page") ||
        document.querySelector("main") ||
        document.body;

    const panel = document.createElement("section");
    panel.className = "release-panel";
    panel.innerHTML = `
        <div class="release-heading">
            <h2>Download</h2>
            <span class="release-status checking">
                Checking availability...
            </span>
        </div>

        <div class="release-info">
            <div class="release-info-item">
                <span>File size</span>
                <strong id="releaseSize">Checking...</strong>
            </div>

            <div class="release-info-item">
                <span>Release date</span>
                <strong id="releaseDate">Checking...</strong>
            </div>

            <div class="release-info-item">
                <span>Version</span>
                <strong id="releaseVersion">—</strong>
            </div>
        </div>

        <div class="release-buttons">
            <a id="downloadIPA" class="release-download disabled">
                Download IPA
            </a>
        </div>

        <p class="release-message" id="releaseMessage">
            Checking files...
        </p>
    `;

    container.appendChild(panel);

    const status = panel.querySelector(".release-status");
    const sizeElement = panel.querySelector("#releaseSize");
    const dateElement = panel.querySelector("#releaseDate");
    const versionElement = panel.querySelector("#releaseVersion");
    const downloadButton = panel.querySelector("#downloadIPA");
    const message = panel.querySelector("#releaseMessage");

    function setStatus(text, type) {
        status.textContent = text;
        status.className = `release-status ${type}`;
    }

    function formatSize(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) {
            return "Unknown";
        }

        const units = ["B", "KB", "MB", "GB"];
        let size = bytes;
        let index = 0;

        while (size >= 1024 && index < units.length - 1) {
            size /= 1024;
            index++;
        }

        return `${size.toFixed(2)} ${units[index]}`;
    }

    function formatDate(value) {
        if (!value) return "Unknown";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "Unknown";
        }

        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    try {
        const appsResponse = await fetch("./apps.json", {
            cache: "no-store"
        });

        if (!appsResponse.ok) {
            throw new Error("Cannot load apps.json");
        }

        const apps = await appsResponse.json();
        const app = apps.find(item => item.id === appId);

        if (!app) {
            throw new Error("Application not found");
        }

        versionElement.textContent = app.version || "Unknown";

        if (!app.releaseTag || !app.assetName || !app.manifestUrl) {
            throw new Error("Release information is incomplete");
        }

        const apiUrl =
            `https://api.github.com/repos/ibrahimmutalip3/Direct/releases/tags/${encodeURIComponent(app.releaseTag)}`;

        const releaseResponse = await fetch(apiUrl, {
            headers: {
                Accept: "application/vnd.github+json"
            },
            cache: "no-store"
        });

        if (!releaseResponse.ok) {
            throw new Error(
                releaseResponse.status === 404
                    ? "GitHub release not found"
                    : `GitHub API error: ${releaseResponse.status}`
            );
        }

        const release = await releaseResponse.json();

        const asset = release.assets.find(item =>
            item.name === app.assetName
        );

        if (!asset || asset.state !== "uploaded" || asset.size <= 0) {
            throw new Error("IPA file is missing or unavailable");
        }

        sizeElement.textContent = formatSize(asset.size);
        dateElement.textContent = formatDate(
            release.published_at || release.created_at
        );

        const manifestResponse = await fetch(app.manifestUrl, {
            cache: "no-store"
        });

        if (!manifestResponse.ok) {
            throw new Error("Manifest is unavailable");
        }

        const manifestText = await manifestResponse.text();

        if (
            !manifestText.includes("<plist") ||
            !manifestText.includes("software-package")
        ) {
            throw new Error("Manifest format is invalid");
        }

        setStatus("All files available", "available");

        downloadButton.href = asset.browser_download_url;
        downloadButton.classList.remove("disabled");
        downloadButton.setAttribute("download", "");

        message.textContent =
            "The IPA and installation manifest are available.";

    } catch (error) {
        console.error("Direct release check:", error);

        setStatus("Availability check failed", "unavailable");

        downloadButton.classList.add("disabled");
        downloadButton.removeAttribute("href");

        message.textContent = error.message ||
            "Unable to verify application files.";

        sizeElement.textContent = "Unavailable";
        dateElement.textContent = "Unavailable";
    }
});
