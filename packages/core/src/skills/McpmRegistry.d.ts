export interface MCPPackage {
    name: string;
    description: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
}
export declare class McpmRegistry {
    private marketplace;
    private registry;
    getTools(): ({
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                query?: undefined;
                name?: undefined;
                alias?: undefined;
                manualCommand?: undefined;
            };
            required?: undefined;
        };
        handler: () => Promise<{
            content: {
                type: string;
                text: string;
            }[];
        }>;
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                query: {
                    type: string;
                };
                name?: undefined;
                alias?: undefined;
                manualCommand?: undefined;
            };
            required: string[];
        };
        handler: (args: {
            query: string;
        }) => Promise<{
            content: {
                type: string;
                text: string;
            }[];
        }>;
    } | {
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: {
                name: {
                    type: string;
                };
                alias: {
                    type: string;
                    description: string;
                };
                manualCommand: {
                    type: string;
                    description: string;
                };
                query?: undefined;
            };
            required: string[];
        };
        handler: (args: {
            name: string;
            alias?: string;
            manualCommand?: string;
        }) => Promise<{
            content: {
                type: string;
                text: string;
            }[];
        }>;
    })[];
}
//# sourceMappingURL=McpmRegistry.d.ts.map