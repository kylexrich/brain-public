import { Command } from "@oclif/core";
import { main } from "../../lib/shared/repo/agents-header.js";

export { collectAgentsFiles, main, processFile, REPO_ROOT, runAgentsMdHeader } from "../../lib/shared/repo/agents-header.js";

export default class RepoAgentsHeader extends Command {
  static description = "Inject AGENTS.md precedence headers across the repo";

  async run(): Promise<void> {
    const exitCode = main();
    if (exitCode !== 0) {
      this.exit(exitCode);
    }
  }
}
