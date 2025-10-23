import fileinput
import json
import os
import re
import shutil
from pathlib import Path
from typing import Union, Optional
from urllib.request import urlretrieve
from zipfile import ZipFile

import iniconfig
from iniconfig import IniConfig, ParseError

iniconfig.COMMENTCHARS = ""

PathLike = Union[str, os.PathLike[str]]

# The output path for the extracted profiles
profile_output_path = Path("./profiles")

PRUSASLICER_URL_PRUSA_FFF = "https://github.com/prusa3d/PrusaSlicer-settings-prusa-fff/archive/refs/heads/main.zip"
PRUSASLICER_URL_NON_PRUSA_FFF = "https://github.com/prusa3d/PrusaSlicer-settings-non-prusa-fff/archive/refs/heads/main.zip"
BAMBUSTUDIO_URL = "https://github.com/bambulab/BambuStudio/archive/refs/heads/master.zip"
ORCASLICER_URL = "https://github.com/SoftFever/OrcaSlicer/archive/refs/heads/main.zip"
CURA_URL = "https://github.com/Ultimaker/fdm_materials/archive/refs/heads/master.zip"


def download_and_extract(slicer_name: str, url: str, member: str, pattern: str, ignore_existing=False):
    """
    :param slicer_name: The name of the slicer
    :param url: The url to download from
    :param member: The folder, or "member" within the zip file of where to begin extraction.
    :param pattern: The pattern the file needs to match to be extracted. The match will be checked against the end of the string.
    :param ignore_existing: If there is an existing folder at the output path, it is typically removed. This option disables that functionality.
    """
    print(f"Downloading {slicer_name} archive...")
    zip_file_path = urlretrieve(url)[0]

    print(f"Extracting {slicer_name} archive...")
    slicer_name = slicer_name.lower()
    output_path = profile_output_path.joinpath(slicer_name)

    # The parameter "member" is expected to be a folder
    # This adds the "/" if it isn't there
    if not member.endswith("/"):
        member += "/"

    # Remove the existing folder structure (if not ignoring existing)
    if not ignore_existing and os.path.exists(output_path):
        shutil.rmtree(output_path)

    with ZipFile(zip_file_path) as zip_f:
        if not pattern.endswith("$"):
            pattern = pattern + "$"
        pattern = re.compile(pattern)
        for file in zip_f.namelist():
            if not file.startswith(member) or file.endswith("/") or not re.match(pattern, file):
                continue
            rel_path = Path(file).relative_to(member)
            dest_path = output_path.joinpath(rel_path)
            parts = dest_path.parts
            if "filament" in parts:
                idx = parts.index("filament")
                parts = parts[:idx] + parts[idx + 1:]
                dest_path = Path(*parts)
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            with zip_f.open(file) as src, open(dest_path, "wb") as dst:
                dst.write(src.read())


def split_prusaslicer_bundle(path: Path):
    """
    Split PrusaSlicer's ini config bundles into individual JSON config files
    :param path: Path to the ini config bundle
    """
    if path.suffix != ".ini":
        return

    try:
        config = IniConfig(path)
    except ParseError as e:
        # Temporary workaround for malformed ini files
        if e.msg == "unexpected value continuation":
            with fileinput.FileInput(path, inplace=True) as f:
                for line in f:
                    print(line.strip())
            config = IniConfig(path)
        else:
            raise

    profiles: dict[str, dict[str, str]] = {}

    # Gather all the profiles from the bundle
    for section in config:
        if not section.name.startswith("filament:"):
            continue
        name = section.name.removeprefix("filament:")
        profiles[name] = dict(section.items())

    # Cached "squashed" profiles
    squashed_profiles: dict[str, dict[str, str]] = {}

    def squash_inherits(profile_name: str):
        """Recursively "squash" the profiles from inherits so that all settings are contained in a single file"""
        if profile_name in squashed_profiles:
            return squashed_profiles[profile_name]

        if "inherits" not in profiles[profile_name]:
            return profiles[profile_name]

        profile = profiles[profile_name]
        profile_out: dict[str, str] = {}
        inherits = [x.strip() for x in profile["inherits"].split(";")]
        for _ in inherits:
            if _ != "":
                profile_out.update(squash_inherits(_))
        profile_out.update(profile)
        del profile_out["inherits"]
        squashed_profiles[profile_name] = profile_out
        return squashed_profiles[profile_name]

    def cleanse_name(file_name: str) -> str:
        return file_name.replace("/", " ")

    for name, data in profiles.items():
        # Profiles that begin with "*" are only for use within the config bundle and should not be exported
        if name.startswith("*"):
            continue
        out_path = path.parent.joinpath(f"{cleanse_name(name)}.json")
        data_out = squash_inherits(name)
        data_out["filament_settings_id"] = name
        with out_path.open("w") as f:
            json.dump(data_out, f, indent=4)


def unpack_prusaslicer_bundles():
    """
    Finds the latest release for each vendor and runs split_prusaslicer_bundle() on it
    All the ini files are also removed during this process
    """
    print("Unpacking PrusaSlicer bundles...")
    version_re = re.compile("([0-9]+)\\.([0-9]+)\\.([0-9]+)\\.ini", re.RegexFlag.IGNORECASE)
    for vendor_dir in profile_output_path.joinpath("prusaslicer").iterdir():
        if not vendor_dir.is_dir():
            continue
        # Find the latest version that is a release version
        latest: tuple[int, int, int] = (0, 0, 0)
        for config_file in vendor_dir.iterdir():
            match = re.fullmatch(version_re, config_file.name)
            if not match:
                continue
            tmp = (int(match.group(1)), int(match.group(2)), int(match.group(3)))
            if tmp[0] <= latest[0] and tmp[1] <= latest[1] and tmp[2] <= latest[2]:
                continue
            latest = tmp

        latest_file_name = f"{latest[0]}.{latest[1]}.{latest[2]}.ini"

        # Delete all except the latest
        for config_file in vendor_dir.iterdir():
            if config_file.name.lower() != latest_file_name:
                config_file.unlink()

        # Split the latest file into individual configs then delete it
        latest_file = vendor_dir.joinpath(latest_file_name)
        split_prusaslicer_bundle(latest_file)
        latest_file.unlink()


def squash_slic3r_profiles(slicer_name: str, filament_library_name: Optional[str] = None):
    """
    Recursively "squash" all profiles for the specified slic3r based slicer

    Note: This function should not be run on PrusaSlicer profiles. Squashing is already handled while unpacking the bundles.
    """
    if slicer_name.lower() == "prusaslicer":
        raise Exception("PrusaSlicer profile squashing is incompatible with this function")

    print(f"Squashing {slicer_name} profiles...")
    slicer_path = profile_output_path.joinpath(slicer_name.lower())

    def load_json_from_folder(folder: Path):
        """Recursively get all the JSON files from a specified folder"""
        profiles: dict[str, tuple[Path, dict]] = {}
        for _item in folder.iterdir():
            if _item.is_dir():
                profiles.update(load_json_from_folder(_item))
                continue
            if _item.suffix != ".json":
                continue
            with _item.open() as f:
                file_data = json.load(f)

            name: str
            if "name" in file_data:
                name = file_data["name"]
            elif "filament_settings_id" in file_data:
                name = file_data["filament_settings_id"]
            else:
                continue

            profiles[name] = (_item, file_data)
        return profiles

    # Load filament library
    filament_library_profiles = {}
    if filament_library_name is not None:
        filament_library_profiles = load_json_from_folder(slicer_path.joinpath(filament_library_name))

    for _vendor_folder in slicer_path.iterdir():
        if not _vendor_folder.is_dir():
            continue

        # Load profiles from the filament library so they can be used as base profiles
        if _vendor_folder.name == filament_library_name:
            profiles = {}
        else:
            profiles = filament_library_profiles.copy()

        # Add profiles from the vendor folder
        # Any profiles with the same name as one from the filament library will override the filament library profile
        profiles.update(load_json_from_folder(_vendor_folder))

        # Cached "squashed" profiles
        squashed_profiles: dict[str, dict] = {}

        def squash_inherits(profile_name: str):
            """Recursively "squash" the profiles from inherits so that all settings are contained in a single file"""
            if profile_name in squashed_profiles:
                return squashed_profiles[profile_name]

            profile = profiles[profile_name][1]
            if "inherits" not in profile:
                return profile

            profile_out = squash_inherits(profile["inherits"]).copy()
            profile_out.update(profile)
            del profile_out["inherits"]
            squashed_profiles[profile_name] = profile_out
            return squashed_profiles[profile_name]

        # Remove all existing profiles
        shutil.rmtree(_vendor_folder)

        # Write out the squashed profiles
        for name, (path, data) in profiles.items():
            # Profiles with instantiation == false are only used as base profiles and don't need to be exported
            # Ensure the folder name is in the path so profiles from the filament library aren't exported into vendor folders
            if data.get("instantiation") != "true" or _vendor_folder.name not in path.parts:
                continue
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("w") as f:
                json.dump(squash_inherits(name), f, indent=4)


def load_overlay_profiles(overlay_path: PathLike = "./overlay"):
    """
    Load overlay profiles and copy them to the profile output directory.
    Overlay profiles can override or supplement the downloaded profiles.

    Overlay profiles should be organized as:
    overlay/profiles/[slicer_name]/[vendor]/[profile_name].json

    :param overlay_path: Path to the overlay directory (default: "./overlay")
    """
    overlay_path = Path(overlay_path)
    profiles_overlay_path = overlay_path.joinpath("profiles")

    # Check if overlay profiles directory exists
    if not profiles_overlay_path.exists():
        print("No overlay profiles directory found, skipping overlay load...")
        return

    print("Loading overlay profiles...")
    overlay_count = 0

    # Iterate through all slicer directories in the overlay
    for slicer_dir in profiles_overlay_path.iterdir():
        if not slicer_dir.is_dir():
            continue

        slicer_name = slicer_dir.name
        output_slicer_path = profile_output_path.joinpath(slicer_name)

        # Iterate through all vendor directories
        for vendor_dir in slicer_dir.iterdir():
            if not vendor_dir.is_dir():
                continue

            vendor_name = vendor_dir.name
            output_vendor_path = output_slicer_path.joinpath(vendor_name)

            # Create vendor directory if it doesn't exist
            output_vendor_path.mkdir(parents=True, exist_ok=True)

            # Copy all JSON profiles from vendor directory
            for profile_file in vendor_dir.iterdir():
                if profile_file.suffix != ".json":
                    continue

                dest_path = output_vendor_path.joinpath(profile_file.name)
                shutil.copy2(profile_file, dest_path)
                overlay_count += 1

    print(f"Loaded {overlay_count} overlay profiles")


def run():
    """
    Run the download and extract routine
    Set global var 'profile_output_path' to set the output path for the profiles
    """

    # Download and unzip PrusaSlicer profiles
    download_and_extract("PrusaSlicer", PRUSASLICER_URL_PRUSA_FFF, "PrusaSlicer-settings-prusa-fff-main/",
                         r".*\.ini")
    download_and_extract("PrusaSlicer", PRUSASLICER_URL_NON_PRUSA_FFF, "PrusaSlicer-settings-non-prusa-fff-main/",
                         r".*\.ini", True)

    unpack_prusaslicer_bundles()

    # Download and unzip BambuStudio profiles
    download_and_extract("BambuStudio", BAMBUSTUDIO_URL, "BambuStudio-master/resources/profiles", ".*/filament/.*")
    squash_slic3r_profiles("BambuStudio")

    # Download and unzip OrcaSlicer profiles
    download_and_extract("OrcaSlicer", ORCASLICER_URL, "OrcaSlicer-main/resources/profiles/", ".*/filament/.*")
    squash_slic3r_profiles("OrcaSlicer", "OrcaFilamentLibrary")

    # Download and unzip Cura profiles
    download_and_extract("Cura", CURA_URL, "fdm_materials-master", ".*.fdm_material$")

    # Load overlay profiles (these can override or supplement downloaded profiles)
    load_overlay_profiles()

    # TODO: Convert cura XML files to custom json


# If running from the command line, provide argument parsing
if __name__ == "__main__":
    from argparse import ArgumentParser

    parser = ArgumentParser()
    parser.add_argument("--profile-path", help="Set the output path for the extracted profiles")
    args = parser.parse_args()

    if isinstance(args.profile_path, str):
        profile_output_path = Path(args.profile_path)

    run()
