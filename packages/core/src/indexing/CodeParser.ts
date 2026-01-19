
import Parser from 'tree-sitter';
import TypeScript from 'tree-sitter-typescript';
import JavaScript from 'tree-sitter-javascript';

export class CodeParser {
    private parsers: Map<string, Parser>;

    constructor() {
        this.parsers = new Map();
        this.initParsers();
    }

    private initParsers() {
        const tsParser = new Parser();
        tsParser.setLanguage(TypeScript.typescript as any);
        this.parsers.set('ts', tsParser);
        this.parsers.set('tsx', tsParser);

        const jsParser = new Parser();
        jsParser.setLanguage(JavaScript as any);
        this.parsers.set('js', jsParser);
        this.parsers.set('jsx', jsParser);
    }

    parse(content: string, extension: string): Parser.Tree | undefined {
        const lang = extension.replace('.', '');
        const parser = this.parsers.get(lang);
        if (!parser) {
            console.warn(`No parser found for ${extension}`); // TODO: Handle gracefully
            return undefined;
        }
        return parser.parse(content);
    }
}
