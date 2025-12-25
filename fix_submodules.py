import subprocess
import configparser
import os

def get_git_submodules():
    result = subprocess.run(['git', 'ls-files', '--stage'], capture_output=True, text=True)
    submodules = []
    for line in result.stdout.splitlines():
        if line.startswith('160000'):
            parts = line.split('\t')
            if len(parts) > 1:
                submodules.append(parts[1])
    return submodules

def get_dotmodules_paths():
    config = configparser.ConfigParser()
    config.read('.gitmodules')
    paths = []
    for section in config.sections():
        if 'path' in config[section]:
            paths.append(config[section]['path'])
    return paths

def main():
    git_submodules = get_git_submodules()
    dotmodules_paths = get_dotmodules_paths()
    
    to_remove = []
    for sub in git_submodules:
        if sub not in dotmodules_paths:
            to_remove.append(sub)
            
    print(f"Found {len(to_remove)} submodules to remove from index:")
    for sub in to_remove:
        print(sub)
        subprocess.run(['git', 'rm', '--cached', sub])

if __name__ == '__main__':
    main()
