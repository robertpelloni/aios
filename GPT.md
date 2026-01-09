# GPT AI Model Documentation
# include "CORE_INSTRUCTIONS.md"

## Overview
GPT (Generative Pre-trained Transformer) is OpenAI's advanced AI model family, specializing in high-fidelity code generation and technical implementation.

## Available Models
- **GPT-5** (gpt-5) - Enhanced reasoning and code generation.
- **GPT-5-Pro** (gpt-5-pro) - High-performance reasoning.
- **GPT-5-Codex** (gpt-5-codex) - Specialized for implementation.
- **GPT-4o** (gpt-4o) - Multimodal capabilities.

## Primary Role: Technical Implementation
- **Implementation**: Generating production-ready code, implementing algorithms, and API development.
- **Verification**: Writing unit tests, integration tests, and performance benchmarks.
- **Database**: SQL optimization, schema design, and data modeling.

## MCP Server Integration

### Code Context (Serena MCP)
```bash
mcp_serena_write_memory --memory_name "gpt_implementations" --content "Implementation patterns for [feature]"
```

### Knowledge Storage (Chroma MCP)
```bash
mcp_chroma-knowledge_chroma_add_document --collection_name "codebase" --document "Implementation detail: [content]"
```

## Best Practices
1. **Consensus Building**: For architectural decisions, use Zen MCP to build consensus between Claude (Architect) and GPT (Implementer).
2. **Implementation Flow**: 
   - Planning: Claude + Gemini define requirements.
   - Implementation: GPT generates code.
   - Review: Claude validates quality.
3. **Tests**: Always implement comprehensive test suites alongside code.

## Troubleshooting
- If generation is incomplete, verify with Claude for quality alignment.
- Use Zen MCP for multi-model consensus on complex logic.
