import os
import subprocess


def get_git_modules_content():
    if not os.path.exists(".gitmodules"):
        return ""
    with open(".gitmodules", "r") as f:
        return f.read()


def is_in_gitmodules(path, content):
    return f"path = {path}" in content


def get_remote_url(path):
    try:
        result = subprocess.run(
            ["git", "-C", path, "remote", "get-url", "origin"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return None


def main():
    root_dir = os.getcwd()
    gitmodules_content = get_git_modules_content()

    # Walk through directories to find git repos
    for dirpath, dirnames, filenames in os.walk(".", topdown=True):
        if ".git" in dirnames:
            # It's a git repo (submodule or root)
            if dirpath == ".":
                continue

            rel_path = os.path.relpath(dirpath, root_dir).replace("\\", "/")

            # Skip if it's inside another submodule (nested submodules are handled by the parent usually,
            # but here we are looking for top-level registered submodules in the main repo)
            # Actually, standard git submodule structure is what we care about.
            # If the current directory is a git repo and it's not in .gitmodules, we might want to add it.

            if not is_in_gitmodules(rel_path, gitmodules_content):
                url = get_remote_url(rel_path)
                if url:
                    print(f"Adding missing submodule: {rel_path} ({url})")
                    with open(".gitmodules", "a") as f:
                        f.write(f'\n[submodule "{rel_path}"]\n')
                        f.write(f"\tpath = {rel_path}\n")
                        f.write(f"\turl = {url}\n")
                else:
                    print(f"Could not find remote for {rel_path}")


if __name__ == "__main__":
    main()
