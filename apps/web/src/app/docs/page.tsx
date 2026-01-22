
import { Navigation } from "../../components/Navigation";

export default function DocsPage() {
    return (
        <div className="flex min-h-screen flex-col bg-zinc-50 font-sans dark:bg-black">
            <main className="flex flex-col items-center w-full max-w-4xl mx-auto px-4 py-8">
                <div className="prose dark:prose-invert w-full">
                    <h1>Borg Documentation</h1>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 my-6">
                        <h3 className="mt-0 text-blue-800 dark:text-blue-200">🚀 Quick Start: Autonomous Mode</h3>
                        <p className="mb-0 text-sm">
                            To enable the <strong>Intelligent Supervisor</strong> (Self-Approving Agent):
                        </p>
                        <ol className="text-sm mt-2">
                            <li>Ensure <strong>Borg Core</strong> is running (<code>pnpm start</code>).</li>
                            <li>Press <strong>F5</strong> in VS Code to launch the Observer Extension.</li>
                            <li>Run: <code>pnpm tsx scripts/activate_autonomy.ts</code> in your terminal.</li>
                        </ol>
                    </div>

                    <h2>Core Features</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose">
                        <FeatureCard
                            title="Mission Control"
                            desc="Real-time dashboard for agent observability. See 'Traffic Inspector' on the home page."
                        />
                        <FeatureCard
                            title="Director Agent"
                            desc="Autonomous planner that executes multi-step coding tasks. Trigger via 'start_task' tool."
                        />
                        <FeatureCard
                            title="VS Code Observer"
                            desc="Passive terminal monitoring and file reading. No focus stealing."
                        />
                        <FeatureCard
                            title="Page Reader"
                            desc="Ability to fetch and read documentation URLs via `read_page` tool."
                        />
                    </div>

                    <h2>Tools Reference</h2>
                    <ul>
                        <li><code>read_page(url)</code>: Fetch markdown content from web.</li>
                        <li><code>list_files(path)</code>: Explore directory structure.</li>
                        <li><code>read_file(path)</code>: Read file content.</li>
                        <li><code>write_file(path, content)</code>: Create/Edit files.</li>
                        <li><code>run_command(command)</code>: Execute shell commands.</li>
                        <li><code>vscode_read_terminal()</code>: Get latest terminal output.</li>
                    </ul>

                </div>
            </main>
        </div>
    );
}

function FeatureCard({ title, desc }: { title: string, desc: string }) {
    return (
        <div className="p-4 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <h3 className="font-bold text-lg mb-1">{title}</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{desc}</p>
        </div>
    );
}
