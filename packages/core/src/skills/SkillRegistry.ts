
import glob from 'fast-glob';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export interface Skill {
    id: string;
    name: string;
    description: string;
    content: string; // The markdown instructions
    path: string;
}

export class SkillRegistry {
    private skills: Map<string, Skill> = new Map();
    private searchPaths: string[];

    constructor(searchPaths: string[]) {
        this.searchPaths = searchPaths;
    }

    async loadSkills() {
        this.skills.clear();

        for (const loc of this.searchPaths) {
            try {
                // Find all SKILL.md files
                const entries = await glob('**/SKILL.md', {
                    cwd: loc,
                    absolute: true,
                    deep: 3 // Go deeper just in case
                });

                for (const file of entries) {
                    await this.parseSkill(file);
                }
            } catch (e) {
                // Ignore missing directories
            }
        }
        console.log(`Borg Core: Loaded ${this.skills.size} skills.`);
    }

    private async parseSkill(filePath: string) {
        try {
            const raw = await fs.readFile(filePath, 'utf-8');
            const { data, content } = matter(raw);

            // Use 'name' from frontmatter or folder name
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

    getSkillTools() {
        return [
            {
                name: "list_skills",
                description: "List all available skills (runbooks)",
                inputSchema: { type: "object", properties: {} }
            },
            {
                name: "read_skill",
                description: "Read the content/instructions of a specific skill",
                inputSchema: {
                    type: "object",
                    properties: {
                        skillName: { type: "string" }
                    },
                    required: ["skillName"]
                }
            }
        ];
    }

    async listSkills() {
        const skillList = Array.from(this.skills.values()).map(s => ({
            name: s.name,
            description: s.description
        }));

        return {
            content: [{
                type: "text",
                text: JSON.stringify(skillList, null, 2)
            }]
        };
    }

    async readSkill(skillName: string) {
        const skill = this.skills.get(skillName);
        if (!skill) {
            return {
                content: [{ type: "text", text: `Skill '${skillName}' not found.` }]
            };
        }

        return {
            content: [{
                type: "text",
                text: skill.content
            }]
        };
    }
}
