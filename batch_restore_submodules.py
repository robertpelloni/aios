import os
import subprocess


def get_gitmodules_paths():
    if not os.path.exists(".gitmodules"):
        return set()
    paths = set()
    with open(".gitmodules", "r") as f:
        for line in f:
            if line.strip().startswith("path ="):
                paths.add(line.split("=")[1].strip())
    return paths


def get_remote_url(path):
    try:
        result = subprocess.run(
            ["git", "-C", path, "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except Exception:
        return None


def main():
    if not os.path.exists("expected_submodules.txt"):
        print("expected_submodules.txt not found")
        return

    existing_paths = get_gitmodules_paths()

    with open("expected_submodules.txt", "r") as f:
        expected_paths = [line.strip() for line in f if line.strip()]

    updates = []

    for path in expected_paths:
        if path in existing_paths:
            continue

        if not os.path.exists(path):
            print(f"Directory not found: {path}")
            continue

        url = get_remote_url(path)
        if url:
            updates.append((path, url))
        else:
            print(f"No remote found for: {path}")

    if updates:
        print(f"Restoring {len(updates)} submodules...")
        with open(".gitmodules", "a") as f:
            for path, url in updates:
                f.write(f'\n[submodule "{path}"]\n')
                f.write(f"\tpath = {path}\n")
                f.write(f"\turl = {url}\n")
        print("Done.")
    else:
        print("No new submodules to restore.")


if __name__ == "__main__":
    main()
