# Agent instructions

## Scope and project layout

This repository contains several independent n8n automation projects. It is not the n8n application source repository. Follow the README, plan, and project-specific documentation in the folder you are changing. Keep changes scoped to that project unless the request calls for shared behavior.

- `AI_news/` contains exported n8n workflows, prompts, data, and setup documentation.
- `alexa-reminder/` contains an n8n workflow, Docker Compose configuration, and a Node.js Alexa service.
- `email-manager/` contains planning material for an n8n workflow.

If a subfolder has its own `AGENTS.md`, follow it together with this file; where they conflict, the subfolder `AGENTS.md` takes precedence for that project. Do not treat workflow examples or plans as permission to contact external services or change a live n8n instance.

## Working with n8n workflows

- Treat workflow exports as n8n JSON documents. Preserve the existing export shape, node names, IDs, connections, settings, and node versions unless the task needs a change. Check nearby workflows and project docs before choosing a pattern.
- Match node parameters and `typeVersion` to the n8n version used by the project. When it is unclear, consult the official n8n documentation or validate the import in a local/test instance; do not guess at a node schema.
- Keep workflow behavior understandable: use descriptive node names, explicit data transformations, and clear success and failure paths. Preserve item pairing and cardinality when mapping data across nodes. Use n8n expressions for runtime data rather than inserting execution-specific values into exports.
- Validate inputs before consequential actions. Make retries safe where a workflow can create duplicate records, reminders, messages, or other external effects. Set reasonable timeouts and handle expected API errors where the relevant node or service supports it.
- Keep credentials in n8n's credential store. Never add credential values, access tokens, cookies, private keys, or personal secrets to workflow JSON, prompts, docs, examples, logs, or commits. Use clearly fake placeholders in examples. Review exported JSON for secrets before committing it.
- Do not activate, execute, or import a workflow into a shared or production n8n instance unless the user explicitly asks for that operation. Prefer static inspection or a local/test instance for verification.

## Supporting code and deployment files

- Keep Docker Compose, Dockerfiles, and service code consistent with the setup documented by their project. Avoid unrelated dependency or image upgrades.
- Read configuration from environment variables or mounted runtime files. Do not hard-code secrets or commit runtime state, authentication data, generated execution data, or local `.env` files.
- For service changes, preserve the existing API contract and account for network boundaries, input validation, and useful error reporting without logging credentials or sensitive payloads.
- Use the package manager and commands declared by the project. Do not assume the upstream n8n monorepo's commands apply here.

## Documentation and changes

- Keep instructions aligned with the actual files and commands in the affected project. Prefer concise, actionable guidance and update the relevant README or plan when behavior or setup changes.
- Make the smallest complete change that fulfills the request. Do not overwrite unrelated user edits or generated files.
- Run only focused, relevant verification for changed files when requested or needed to establish correctness. For workflow JSON, a syntax parse can confirm valid JSON but does not prove that n8n can import or run it. State any verification limits clearly.

## References

- [n8n documentation: data mapping](https://docs.n8n.io/data/data-mapping/data-mapping-ui/)
- [n8n documentation: item linking for node creators](https://docs.n8n.io/data/data-mapping/data-item-linking/item-linking-node-building/)
- [n8n documentation: executions and retries](https://docs.n8n.io/workflows/executions/all-executions/)
- [n8n documentation: sharing and credentials](https://docs.n8n.io/workflows/sharing/)
- [n8n documentation: custom node development environment](https://docs.n8n.io/integrations/creating-nodes/build/node-dev-environment/)
