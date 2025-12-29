import chokidar from 'chokidar';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { SkillDefinition } from '../types.js';

export class SkillManager extends EventEmitter {
  private skills: Map<string, SkillDefinition> = new Map();
  private watcher: chokidar.FSWatcher | null = null;
  
  constructor(private skillsDir: string) {
    super();
  }

  async start() {
    // Also watch imported skills
    const importedSkillsDir = path.resolve(process.cwd(), 'skills/imported');
    const watchPaths = [this.skillsDir, importedSkillsDir];

    this.watcher = chokidar.watch(watchPaths, {
      ignored: /(^|[\/\\])\../, 
      persistent: true
    });

    this.watcher.on('add', this.loadSkill.bind(this));
    this.watcher.on('change', this.loadSkill.bind(this));
    this.watcher.on('unlink', this.removeSkill.bind(this));
    
    console.log(`[SkillManager] Watching ${watchPaths.join(', ')}`);
  }

  private async loadSkill(filepath: string) {
    try {
      // Check if it's a directory (for imported skills structure)
      // Since chokidar emits 'add' for files, we check if the file is SKILL.md
      const filename = path.basename(filepath);
      
      if (filename === 'SKILL.md' || filename.endsWith('.skill.md')) {
         const content = await fs.readFile(filepath, 'utf-8');
         let skillName = filename.replace('.skill.md', '').replace('.md', '');
         
         // If it's SKILL.md, use the parent directory name as the skill name
         if (filename === 'SKILL.md') {
             skillName = path.basename(path.dirname(filepath));
         }

         const skill: SkillDefinition = {
             name: skillName,
             content: content
         };
         this.skills.set(skillName, skill); // Use Name as key, not filename
         console.log(`[SkillManager] Loaded skill: ${skill.name}`);
         this.emit('updated', this.getSkills());
      }
    } catch (err) {
      console.error(`[SkillManager] Error loading skill ${filepath}:`, err);
    }
  }

  private removeSkill(filepath: string) {
      let skillName = path.basename(filepath).replace('.skill.md', '').replace('.md', '');
      if (path.basename(filepath) === 'SKILL.md') {
          skillName = path.basename(path.dirname(filepath));
      }
      this.skills.delete(skillName);
      this.emit('updated', this.getSkills());
  }

  getSkills() {
    return Array.from(this.skills.values());
  }
}
