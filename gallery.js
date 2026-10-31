document.addEventListener("DOMContentLoaded", async () => {
    const gallery = document.getElementById("screenshotsGallery");
    const gallerySection = document.getElementById("screenshotsSection");

    if (!gallery || !gallerySection) return;

    const params = new URLSearchParams(window.location.search);
    const appId = params.get("id");

    try {
        const response = await fetch("./apps.json");

        if (!response.ok) {
            throw new Error("Failed to load apps.json");
        }

        const apps = await response.json();
        const app = apps.find(item => item.id === appId);

        if (!app || !Array.isArray(app.screenshots) || app.screenshots.length === 0) {
            gallerySection.hidden = true;
            return;
        }

        gallery.innerHTML = "";

        app.screenshots.forEach((src, index) => {
            if (typeof src !== "string" || !src.trim()) return;

            const image = document.createElement("img");
            image.src = src;
            image.alt = `${app.name} screenshot ${index + 1}`;
            image.loading = "lazy";

            image.addEventListener("error", () => {
                image.remove();
            });

            gallery.appendChild(image);
        });

        if (gallery.children.length === 0) {
            gallerySection.hidden = true;
        }
    } catch (error) {
        console.error("Gallery error:", error);
        gallerySection.hidden = true;
    }
});
