export declare const OrchestrationTools: {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            prompt: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    handler: (args: any) => Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
}[];
//# sourceMappingURL=OrchestrationTools.d.ts.map