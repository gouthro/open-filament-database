# Streamlit CRUD interface for store entries
import json
import os
from pathlib import Path
import streamlit as st

# Base directory for store data
STORE_DIR = Path("stores")
SCHEMA_PATH = Path("schemas/store_schema.json")

# Load store schema for validation or field defaults
with open(SCHEMA_PATH, "r", encoding="utf8") as f:
    STORE_SCHEMA = json.load(f)


def load_store(store_id: str):
    store_path = STORE_DIR / store_id / "store.json"
    if store_path.exists():
        with open(store_path, "r", encoding="utf8") as f:
            return json.load(f)
    return None


def save_store(store_id: str, data: dict):
    store_folder = STORE_DIR / store_id
    store_folder.mkdir(parents=True, exist_ok=True)
    with open(store_folder / "store.json", "w", encoding="utf8") as f:
        json.dump(data, f, indent=4)


def delete_store(store_id: str):
    store_folder = STORE_DIR / store_id
    if store_folder.exists():
        for file in store_folder.iterdir():
            file.unlink()
        store_folder.rmdir()


st.title("Store Management")

# Sidebar for selecting store
store_files = sorted([p.name for p in STORE_DIR.iterdir() if p.is_dir()])
selected = st.sidebar.selectbox("Select store", ["<new>"] + store_files)

if selected == "<new>":
    st.header("Create New Store")
    store_data = {k: None for k in STORE_SCHEMA["properties"].keys()}
else:
    st.header(f"Edit Store: {selected}")
    store_data = load_store(selected)
    if not store_data:
        st.error("Store file not found.")
        st.stop()

# Form fields
with st.form(key="store_form"):
    store_id = st.text_input("ID", value=store_data.get("id", ""))
    name = st.text_input("Name", value=store_data.get("name", ""))
    storefront_url = st.text_input("Storefront URL", value=store_data.get("storefront_url", ""))
    affiliate = st.checkbox("Affiliate", value=store_data.get("affiliate", False))
    logo = st.text_input("Logo", value=store_data.get("logo", ""))
    ships_from = st.text_area("Ships From (comma separated)", value=", ".join(store_data.get("ships_from", [])))
    ships_to = st.text_area("Ships To (comma separated)", value=", ".join(store_data.get("ships_to", [])))
    submit = st.form_submit_button("Save")

if submit:
    updated = {
        "id": store_id.strip(),
        "name": name.strip(),
        "storefront_url": storefront_url.strip(),
        "affiliate": bool(affiliate),
        "logo": logo.strip(),
        "ships_from": [x.strip() for x in ships_from.split(",") if x.strip()],
        "ships_to": [x.strip() for x in ships_to.split(",") if x.strip()],
    }
    save_store(store_id, updated)
    st.success("Store saved.")

# Delete operation
if selected != "<new>":
    if st.button("Delete Store", type="primary"):
        delete_store(selected)
        st.success("Store deleted.")
