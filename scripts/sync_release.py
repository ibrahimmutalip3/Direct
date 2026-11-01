
import json
import plistlib
import re
import sys
import zipfile
from pathlib import Path
from datetime import datetime, timezone


def fail(message):
    print(f"ERROR: {message}")
    sys.exit(1)


if len(sys.argv) != 3:
    fail("Usage: sync_release.py RELEASE_JSON IPA_DIRECTORY")

release_file = Path(sys.argv[1])
ipa_directory = Path(sys.argv[2])

release = json.loads(release_file.read_text(encoding="utf-8"))
tag = release.get("tag_name", "")

match = re.fullmatch(r"([a-z0-9][a-z0-9_-]*)-v(.+)", tag, re.IGNORECASE)

if not match:
    fail("Tag must follow app-id-v1.0.0 format, e.g. delta-v2.8.0")

app_id = match.group(1).lower()
tag_version = match.group(2)

ipa_files = list(ipa_directory.glob("*.ipa"))

if len(ipa_files) != 1:
    fail(f"Expected exactly one IPA file, found {len(ipa_files)}")

ipa_path = ipa_files[0]
asset_name = ipa_path.name

asset = next(
    (item for item in release.get("assets", [])
     if item.get("name") == asset_name),
    None
)

if not asset or not asset.get("browser_download_url"):
    fail("IPA asset or its download URL was not found in the Release")

ipa_url = asset["browser_download_url"]

# Extract application metadata from the IPA.
try:
    with zipfile.ZipFile(ipa_path, "r") as archive:
        info_files = [
            name for name in archive.namelist()
            if re.fullmatch(r"Payload/[^/]+\.app/Info\.plist", name)
        ]

        if len(info_files) != 1:
            fail("Could not identify exactly one application Info.plist")

        info = plistlib.loads(archive.read(info_files[0]))

except Exception as error:
    fail(f"Cannot read IPA metadata: {error}")

bundle_id = info.get("CFBundleIdentifier")
bundle_version = info.get("CFBundleVersion")
short_version = info.get("CFBundleShortVersionString")

if not bundle_id or not bundle_version:
    fail("IPA is missing CFBundleIdentifier or CFBundleVersion")

version = str(short_version or tag_version)
display_name = (
    info.get("CFBundleDisplayName")
    or info.get("CFBundleName")
    or app_id.replace("-", " ").replace("_", " ").title()
)

families = info.get("UIDeviceFamily", [1])
devices = []

if 1 in families:
    devices.append("iPhone")
if 2 in families:
    devices.append("iPad")
if not devices:
    devices = ["iPhone"]

# Paths and public URLs.
manifest_path = Path("manifests") / f"{app_id}.plist"
manifest_path.parent.mkdir(parents=True, exist_ok=True)

pages_base = "https://ibrahimmutalip3.github.io/Direct"
manifest_url = f"{pages_base}/manifests/{app_id}.plist"

# Create the OTA manifest for this signed IPA.
manifest = {
    "items": [
        {
            "assets": [
                {
                    "kind": "software-package",
                    "url": ipa_url
                }
            ],
            "metadata": {
                "bundle-identifier": bundle_id,
                "bundle-version": str(bundle_version),
                "kind": "software",
                "title": str(display_name)
            }
        }
    ]
}

manifest_path.write_bytes(
    plistlib.dumps(manifest, fmt=plistlib.FMT_XML, sort_keys=False)
)

# Load the app catalog.
catalog_path = Path("apps.json")

try:
    apps = json.loads(catalog_path.read_text(encoding="utf-8"))
except Exception as error:
    fail(f"Cannot read apps.json: {error}")

if not isinstance(apps, list):
    fail("apps.json must contain an array")

app = next((item for item in apps if item.get("id") == app_id), None)

if app and app.get("type") == "profile":
    fail("This ID belongs to a profile and cannot be replaced by an IPA")

today = datetime.now(timezone.utc).date().isoformat()

if app is None:
    app = {
        "id": app_id,
        "type": "app",
        "name": display_name,
        "description": "",
        "category": "Other",
        "icon": "./assets/logo.svg",
        "screenshots": [],
        "dateAdded": today
    }
    apps.append(app)
    print(f"Created catalog entry: {app_id}")

# Update technical fields while preserving manually edited presentation fields.
app["type"] = "app"
app["version"] = version
app["ipa"] = ipa_url
app["manifestUrl"] = manifest_url
app["releaseTag"] = tag
app["assetName"] = asset_name
app["bundleId"] = bundle_id
app["bundleVersion"] = str(bundle_version)
app["supportedDevices"] = devices
app["updatedAt"] = today

catalog_path.write_text(
    json.dumps(apps, ensure_ascii=False, indent=4) + "\n",
    encoding="utf-8"
)

print(f"Updated {app_id} to {version}")
print(f"Bundle ID: {bundle_id}")
print(f"IPA: {ipa_url}")
print(f"Manifest: {manifest_url}")
