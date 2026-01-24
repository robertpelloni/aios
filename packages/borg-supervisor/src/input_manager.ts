import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export class InputManager {
    async sendKeys(keys: string) {
        // Map common keys to SendKeys format
        const keyMap: Record<string, string> = {
            'ctrl+r': '^{r}',
            'f5': '{F5}',
            'enter': '{ENTER}',
            'esc': '{ESC}',
            'control+enter': '^{ENTER}',
            'ctrl+enter': '^{ENTER}',
            'shift+enter': '+{ENTER}',
            'alt+enter': '%{ENTER}',
            'y': 'y',
            'tab': '{TAB}'
        };

        const sendKeysCommand = keyMap[keys.toLowerCase()] || keys;
        console.log(`[InputManager] Sending keys: ${keys} -> ${sendKeysCommand}`);

        // PowerShell script to FIRST activate VS Code, THEN send keys
        // Note: Using template literal with escaped PS script
        const psScript = `
            Add-Type -AssemblyName Microsoft.VisualBasic
            $procs = Get-Process -Name 'Code' -ErrorAction SilentlyContinue
            if ($procs) {
                [Microsoft.VisualBasic.Interaction]::AppActivate($procs[0].Id) | Out-Null
                Start-Sleep -Milliseconds 200
            }
            (New-Object -ComObject wscript.shell).SendKeys('${sendKeysCommand}')
        `.replace(/\n/g, '; ').replace(/"/g, '\\"');

        try {
            await execAsync(`powershell -Command "${psScript}"`);
            console.log(`[InputManager] ✅ Keys sent successfully: ${keys}`);
            return `Successfully sent keys: ${keys}`;
        } catch (error: any) {
            console.error(`[InputManager] ❌ Error sending keys: ${error.message}`);
            return `Error sending keys: ${error.message}`;
        }
    }
}
