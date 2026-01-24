
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export class InputTools {
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
            'alt': '%',
            'tab': '{TAB}'
        };

        const command = keyMap[keys.toLowerCase()] || keys;

        // PowerShell script to use WScript.Shell SendKeys
        // FORCE FOCUS: Try multiple titles
        const psCommand = `
            $wshell = New-Object -ComObject wscript.shell;
            $titles = @('Code - Insiders', 'Visual Studio Code', 'Code', 'borg', 'Terminal', 'Debug', 'Test');
            
            $focused = $false;
            foreach ($t in $titles) {
                if ($wshell.AppActivate($t)) {
                    $focused = $true;
                    break;
                }
            }
            
            # Audible Cue that we are acting
            [console]::beep(800, 100);

            Start-Sleep -Milliseconds 200;
            $wshell.SendKeys('${command}')
        `;

        try {
            await execAsync(`powershell -Command "${psCommand}"`);
            return `Successfully sent keys: ${keys}`;
        } catch (error: any) {
            return `Error sending keys: ${error.message}`;
        }
    }
}
