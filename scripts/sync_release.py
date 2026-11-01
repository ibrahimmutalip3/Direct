
import json
import plistlib
import re
import sys
import zipfile
from pathlib import Path
from datetime import datetime, timezone
from urllib.parse import quote


def fail(message):
    print(f"ERROR: {message}")
    sys.exit(1)


release_file = Path(sys.argv[1])
ipa_directory = Path(sys.argv[2])

release = json.loads(release_file.read_text(encoding="utf-8"))

tag = release.get("tag_name", "")

match = re.fullmatch(
    r"([a-z0-9][a-z0-9_-]*)-v(.+)",
    tag,
    re.IGNORECASE
)

if not match:
    fail("Tag must follow app-id-v1.0.0 format")

app_id = match.group(1).lower()
tag_version = match.group(2)

ipa_files = list(ipa_directory.glob("*.ipa"))

if len(ipa_files) != 1:
    fail("Exactly one IPA file is required")

ipa_path = ipa_files[0]
asset_name = ipa_path.name

assets = release.get("assets", [])

asset = next(
    (item for item in assets if item.get("name") == asset_name),
    None
)

if not asset:
    fail("IPA asset was not found in GitHub Release")

ipa_url = asset.get("browser_download_url")

if not ipa_url:
    fail("Release asset URL is missing")


# Read actual application metadata from IPA
try:
    with zipfile.ZipFile(ipa_path, "r") as archive:
        info_files = [
            name for name in archive.namelist()
            if re.fullmatch(
                r"Payload/[^/]+\.app/Info\.plist",
                name
            )
        ]

        if len(info_files) != 1:
            fail("Could not identify a single application Info.plist")

        info = plistlib.loads(
            archive.read(info_files[0])
        )

except Exception as error:
    fail(f"Cannot read IPA metadata: {error}")


bundle_id = info.get("CFBundleIdentifier")
short_version = info.get("CFBundleShortVersionString")
bundle_version = info.get("CFBundleVersion")

if not bundle_id:
    fail("CFBundleIdentifier is missing")

if not bundle_version:
    fail("CFBundleVersion is missing")

version = str(short_version or tag_version)

families = info.get("UIDeviceFamily", [1])

devices = []

if 1 in families:
    devices.append("iPhone")

if 2 in families:
    devices.append("iPad")

if not devices:
    devices = ["iPhone"]


# Read catalog
catalog_path = Path("apps.json")

try:
    apps = json.loads(catalog_path.read_text(encoding="utf-8"))
except Exception as error:
    fail(f"Cannot read apps.json: {error}")

if not isinstance(apps, list):
    fail("apps.json must contain an array")


app = next(
    (item for item in apps if item.get("id") == app_id),
    None
)

if app and app.get("type") == "profile":
    fail("Cannot replace a profile entry with an IPA")

now = datetime.now(timezone.utc).date().isoformat()

if app is None:
    # Create a new application with editable defaults
    app = {
        "id": app_id,
        "type": "app",
        "name": app_id.replace("-", " ").replace("_", " ").title(),
        "description": "",
        "category": "Other",
        "version": version,
        "ipa": ipa_url,
        "manifestUrl": "",
        "releaseTag": tag,
        "assetName": asset_name,
        "icon": "./assets/logo.svg",
        "bundleId": bundle_id,
        "bundleVersion": str(bundle_version),
        "supportedDevices": devices,
        "screenshots": [],
        "dateAdded": now
    }

    apps.append(app)

    print(f"Created new application: {app_id}")

else:
    # Update technical fields only.
    # Preserve name, description, category, icon and screenshots.
    app["version"] = version
    app["ipa"] = ipa_url
    app["releaseTag"] = tag
    app["assetName"] = asset_name
    app["bundleId"] = bundle_id
    app["bundleVersion"] = str(bundle_version)
    app["supportedDevices"] = devices
    app["updatedAt"] = now

    print(f"Updated application: {app_id}")


catalog_path.write_text(
    json.dumps(apps, ensure_ascii=False, indent=4) + "\n",
    encoding="utf-8"
)

print("Catalog successfully updated.")
print(f"App ID: {app_id}")
print(f"Version: {version}")
print(f"Bundle ID: {bundle_id}")
print(f"IPA: {ipa_url}")
