'use server';

import { getSubmodules, SubmoduleInfo } from '@/lib/git';
import path from 'path';

// Hardcoded workspace root for now - ideally passed via env or config
// Since this ends up running in the Next.js server, we need to know where the repo root is relative to CWD.
// CWD is usually apps/web or workspace root depending on how it's started.
// We'll assume process.cwd() is .../apps/web, so we go up two levels.

export async function fetchSubmodulesAction(): Promise<SubmoduleInfo[]> {
    const root = path.resolve(process.cwd(), '../../');
    // Safety check: ensure .gitmodules exists here
    console.log("Scanning submodules in:", root);
    return await getSubmodules(root);
}

export async function healSubmodulesAction(): Promise<{ success: boolean, message: string }> {
    const root = path.resolve(process.cwd(), '../../');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
        console.log("Healing submodules in:", root);
        // This command initializes and updates all submodules, fixing "missing" or "empty" states.
        // We use --remote to fetch latest if desired, but standard update is safer for stability.
        await execAsync('git submodule update --init --recursive', { cwd: root });
        return { success: true, message: "Submodule heal command executed successfully." };
    } catch (e: any) {
        console.error("Heal failed:", e);
        return { success: false, message: `Failed to heal submodules: ${e.message}` };
    }
}
