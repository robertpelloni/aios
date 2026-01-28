
import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:3001');

ws.on('open', () => {
    console.log('Connected to Borg Hub');

    // Simulate User Editing a TS file to trigger Linter Suggestion
    const activityMsg = {
        type: 'USER_ACTIVITY',
        lastActivityTime: Date.now(),
        activeEditor: {
            uri: 'C:\\Users\\hyper\\workspace\\borg\\packages\\core\\src\\index.ts'
        }
    };

    ws.send(JSON.stringify(activityMsg));
    console.log('Sent Activity:', activityMsg);

    setTimeout(() => {
        ws.close();
    }, 1000);
});
