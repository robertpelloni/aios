
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);


import fs from 'fs';
import path from 'path';
import os from 'os';

export class InputTools {
    async sendKeys(keys: string, forceFocus: boolean = false) {
        console.error(`[InputTools] ⌨️ Sending keys: ${keys} (Focus: ${forceFocus})`);

        // Map keys to VBScript SendKeys format
        const vbMap: Record<string, string> = {
            'ctrl+r': '^r',
            'f5': '{F5}',
            'enter': '{ENTER}',
            'esc': '{ESC}',
            'control+enter': '^{ENTER}',
            'ctrl+enter': '^{ENTER}',
            'shift+enter': '+{ENTER}',
            'alt+enter': '%{ENTER}',
            'y': 'y'
        };

        const command = vbMap[keys.toLowerCase()] || keys;

        // Create VBScript file
        let focusLogic = "";
        if (forceFocus) {
            focusLogic = `
            ' Try to focus commonly used windows
            On Error Resume Next
            WshShell.AppActivate "Code - Insiders"
            WshShell.AppActivate "Visual Studio Code"
            WshShell.AppActivate "Code"
            WshShell.AppActivate "borg"
            WshShell.AppActivate "Terminal"
            On Error GoTo 0
            `;
        }

        const vbsContent = `
Set WshShell = WScript.CreateObject("WScript.Shell")
${focusLogic}
WScript.Sleep 100
WshShell.SendKeys "${command}"
`;

        const tempFile = path.join(os.tmpdir(), `borg_input_${Date.now()}.vbs`);

        try {
            fs.writeFileSync(tempFile, vbsContent);
            await execAsync(`cscript //Nologo "${tempFile}"`);
            fs.unlinkSync(tempFile);
            return `Sent keys via VBS: ${keys}`;
        } catch (error: any) {
            console.error(`[InputTools] VBS Error: ${error.message}`);
            return `Error sending keys: ${error.message}`;
        }
    }
}

