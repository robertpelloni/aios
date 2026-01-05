import subprocess
import os
import datetime
import re


def get_submodule_status():
    """Gets status of registered submodules."""
    result = subprocess.run(
        ["git", "submodule", "status", "--recursive"], capture_output=True, text=True
    )
    submodules = {}
    for line in result.stdout.splitlines():
        parts = line.strip().split()
        if len(parts) >= 2:
            # git submodule status output: [-/+]commit path [describe]
            commit = parts[0].lstrip("-+U")  # Remove status indicators
            path = parts[1]
            version = parts[2] if len(parts) > 2 else "unknown"
            submodules[path] = {
                "commit": commit,
                "version": version,
                "is_submodule": True,
            }
    return submodules


def find_embedded_repos(root_dir):
    """Finds git repositories that are NOT registered submodules (embedded)."""
    embedded = {}
    for dirpath, dirnames, filenames in os.walk(root_dir):
        if ".git" in dirnames:
            # It's a git repo
            rel_path = os.path.relpath(dirpath, start=".")
            # Skip the root repo itself
            if rel_path == ".":
                continue

            # Check if this is inside an already known submodule?
            # (Simple check: is it effectively a standalone repo we care about)
            embedded[rel_path.replace(os.sep, "/")] = {
                "commit": "HEAD",
                "version": "embedded",
                "is_submodule": False,
            }

            # Don't recurse into .git
            dirnames.remove(".git")
    return embedded


def get_repo_description(repo_path):
    """Attempts to extract a description from README.md."""
    readme_names = ["README.md", "readme.md", "README.txt", "ReadMe.md"]
    for name in readme_names:
        try:
            full_path = os.path.join(repo_path, name)
            if os.path.exists(full_path):
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    # Read first few lines
                    lines = f.readlines()
                    # Look for the first non-header line, or just a good summary
                    for line in lines[:10]:
                        line = line.strip()
                        if line and not line.startswith("#") and len(line) > 10:
                            return line[:100] + "..." if len(line) > 100 else line
                    return "No description found in README."
        except Exception:
            continue
    return "No README found."


def generate_dashboard():
    date_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 1. Get registered submodules
    registered = get_submodule_status()

    # 2. Scan external/ for structure and potentially embedded repos
    # We specifically look for the structure created: external/<category>/<repo>

    categories = {
        "agents_repos": "Agents",
        "auth": "Authentication",
        "config_repos": "Configuration & Templates",
        "misc": "Miscellaneous",
        "plugins": "Plugins",
        "research": "Research",
        "skills_repos": "Skills",
        "tools": "Tools",
        "web_repos": "Web Interfaces",
        "submodules": "Core Submodules",  # Legacy/Core location
    }

    dashboard_data = {}  # category -> list of repos

    # Helper to process a path
    def process_repo(path, info):
        # Determine category
        parts = path.split("/")
        if parts[0] == "external" and len(parts) > 1:
            cat_key = parts[1]
            category = categories.get(cat_key, cat_key.capitalize())
        elif parts[0] == "submodules":
            category = categories.get("submodules")
        else:
            category = "Other"

        if category not in dashboard_data:
            dashboard_data[category] = []

        desc = get_repo_description(path)

        # Get commit hash if embedded (since git submodule status didn't give it)
        commit = info["commit"]
        if not info["is_submodule"]:
            try:
                # Run git rev-parse HEAD in that directory
                res = subprocess.run(
                    ["git", "rev-parse", "--short", "HEAD"],
                    cwd=path,
                    capture_output=True,
                    text=True,
                )
                if res.returncode == 0:
                    commit = res.stdout.strip()
            except:
                commit = "unknown"

        name = os.path.basename(path)

        dashboard_data[category].append(
            {
                "name": name,
                "path": path,
                "version": info["version"],
                "commit": commit,
                "description": desc,
                "type": "Submodule" if info["is_submodule"] else "Embedded",
            }
        )

    # Process registered submodules
    for path, info in registered.items():
        process_repo(path, info)

    # Check for known embedded repos that might not be in registered list
    # The previous agent mentioned specific ones. Let's scan external/ just in case.
    if os.path.exists("external"):
        for cat_dir in os.listdir("external"):
            cat_path = os.path.join("external", cat_dir)
            if os.path.isdir(cat_path):
                for repo_dir in os.listdir(cat_path):
                    full_path = os.path.join(cat_path, repo_dir).replace(os.sep, "/")

                    # If we haven't processed this path yet
                    if full_path not in registered:
                        # Check if it looks like a repo (has .git)
                        if os.path.exists(os.path.join(full_path, ".git")):
                            process_repo(
                                full_path,
                                {
                                    "commit": "HEAD",
                                    "version": "embedded",
                                    "is_submodule": False,
                                },
                            )

    # Generate Markdown
    content = f"""# Submodule Dashboard

**Last Updated:** {date_str}

This document tracks the status of all submodules and repositories in the aios project.

"""

    # Sort categories to keep consistent order
    sorted_cats = sorted(dashboard_data.keys())

    for cat in sorted_cats:
        repos = dashboard_data[cat]
        if not repos:
            continue

        content += f"## {cat}\n\n"
        content += "| Name | Path | Type | Commit | Description |\n"
        content += "|------|------|------|--------|-------------|\n"

        for repo in sorted(repos, key=lambda x: x["name"]):
            content += f"| **{repo['name']}** | `{repo['path']}` | {repo['type']} | `{repo['commit'][:7]}` | {repo['description']} |\n"
        content += "\n"

    content += """## Directory Structure
    
- **external/**: Contains third-party or decoupled components organized by category.
- **submodules/**: Contains core integrated components.
"""

    return content


if __name__ == "__main__":
    try:
        content = generate_dashboard()
        with open("docs/SUBMODULE_DASHBOARD.md", "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Dashboard updated at docs/SUBMODULE_DASHBOARD.md")
    except Exception as e:
        print(f"Error generating dashboard: {e}")
