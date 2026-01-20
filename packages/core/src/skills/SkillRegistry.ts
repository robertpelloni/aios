
import glob from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import os from 'os';

export interface Skill {
    id: string;
    name: string;
    description: string;
    content: string; // The markdown instructions
    path: string;
}

export class SkillRegistry {
    private skills: Map<string, Skill> = new Map();
    private workspaceRoot: string;

    constructor(workspaceRoot: string) {
        this.workspaceRoot = workspaceRoot;
    }

    async loadSkills() {
        this.skills.clear();
        const locations = [
            path.join(os.homedir(), '.borg', 'skills'), // Global
            path.join(this.workspaceRoot, '.borg', 'skills') // Local
        ];

        for (const loc of locations) {
            try {
                // Find all SKILL.md files
                const entries = await glob('**/SKILL.md', {
                    cwd: loc,
                    absolute: true,
                    deep: 2
                });

                for (const file of entries) {
                    await this.parseSkill(file);
                }
            } catch (e) {
                // Ignore missing directories
            }
        }
        console.log(`Loaded ${this.skills.size} skills.`);
    }

    private async parseSkill(filePath: string) {
        try {
            const raw = await fs.readFile(filePath, 'utf-8');
            const { data, content } = matter(raw);

            const id = data.name || path.basename(path.dirname(filePath));

            const skill: Skill = {
                id,
                name: data.name || id,
                description: data.description || "No description provided",
                content,
                path: filePath
            };

            this.skills.set(id, skill);
        } catch (e) {
            console.error(`Failed to parse skill at ${filePath}`, e);
        }
    }

    listSkills(): Skill[] {
        return Array.from(this.skills.values());
    }

    getSkill(id: string): Skill | undefined {
        return this.skills.get(id);
    }
}
