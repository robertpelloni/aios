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
        # Use shell=True for windows compatibility sometimes, but list args is safer
        # On windows git might be strictly requiring / or \ depending on shell, but relative path usually works
        result = subprocess.run(
            ["git", "-C", path, "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except Exception as e:
        return None


def main():
    existing_paths = get_gitmodules_paths()
    root = os.getcwd()

    updates = []

    # Walk top-down
    for dirpath, dirnames, filenames in os.walk(".", topdown=True):
        # modification to avoid traversing INTO existing submodules to find nested ones
        # (git usually manages nested ones within the parent submodule's scope, not the root)
        # But here we are looking for lost submodules of the ROOT repo.

        # Calculate relative path
        rel_path = os.path.relpath(dirpath, root).replace("\\", "/")

        if rel_path == ".":
            # Don't recurse into .git folder
            if ".git" in dirnames:
                dirnames.remove(".git")
            continue

        if ".git" in dirnames:
            # It is a git repo
            if rel_path not in existing_paths:
                url = get_remote_url(rel_path)
                if url:
                    updates.append((rel_path, url))
                    # Don't recurse into this repo looking for more repos *registered to the root*
                    # because they would be sub-submodules
                    dirnames[:] = []
            else:
                # It is already a known submodule, don't recurse inside it for root-level modules
                dirnames[:] = []

    if updates:
        print(f"Found {len(updates)} missing submodules.")
        with open(".gitmodules", "a") as f:
            for path, url in updates:
                print(f"Restoring: {path}")
                f.write(f'\n[submodule "{path}"]\n')
                f.write(f"\tpath = {path}\n")
                f.write(f"\turl = {url}\n")
    else:
        print("No missing submodules found in directory tree.")


if __name__ == "__main__":
    main()
