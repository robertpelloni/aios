import { SquadWidget } from "../components/SquadWidget";
import { CouncilWidget } from "../components/CouncilWidget"; // Import CouncilWidget
import ConnectionStatus from "../components/ConnectionStatus";
import IndexingStatus from "../components/IndexingStatus";
import RemoteAccessCard from "../components/RemoteAccessCard";
// import ConfigEditor from "../components/ConfigEditor";
import DirectorConfig from "../components/DirectorConfig";
import { TraceViewer } from "../components/TraceViewer";
import { CommandRunner } from "../components/CommandRunner";
import { AutonomyControl } from "../components/AutonomyControl";
import { DirectorChat } from "../components/DirectorChat";
import { TrafficInspector } from "../components/TrafficInspector";
import { SkillsViewer } from "../components/SkillsViewer";
import { PageReaderTester } from "../components/PageReaderTester";
import { ContextWidget } from "../components/ContextWidget";
import { CommandCheatsheet } from "../components/CommandCheatsheet";
import { AuditLogViewer } from "../components/AuditLogViewer";
import { SandboxWidget } from "../components/SandboxWidget";
import { TestStatusWidget } from "../components/TestStatusWidget";
import { GraphWidget } from "../components/GraphWidget";
import { ShellHistoryWidget } from "../components/ShellHistoryWidget";

import SuggestionsPanel from "../components/SuggestionsPanel";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black py-12">
      <main className="flex flex-col items-center gap-8 w-full max-w-4xl px-4">
        <h1 className="text-4xl font-bold">Borg Mission Control</h1>

        {/* Engagement Module: Proactive Suggestions */}
        <div className="w-full">
          <SuggestionsPanel />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <ConnectionStatus />
          <IndexingStatus />
        </div>

        {/* Director & Council Layer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="flex flex-col gap-4">
            <AutonomyControl />
            <DirectorChat />
          </div>
          <CouncilWidget />
        </div>

        <div className="w-full">
          {/* Dynamic Import or lazy load if heavy, but fine for now */}
          <AuditLogViewer />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <ContextWidget />
          <CommandCheatsheet />
        </div>

        {/* Engagement Module: Shell History */}
        <div className="w-full">
          <ShellHistoryWidget />
        </div>

        <SkillsViewer />

        {/* Squad & Sandbox Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          <div className="flex flex-col gap-4">
            <SquadWidget />
            <TestStatusWidget />
          </div>
          <div className="flex flex-col gap-4">
            <SandboxWidget />
          </div>
        </div>

        <div className="w-full h-80">
          <GraphWidget />
        </div>

        <div className="w-full h-80">
          <GraphWidget />
        </div>

        <DirectorConfig />
        <CommandRunner />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <TraceViewer />
          <TrafficInspector />
        </div>
      </main>
    </div>
  );
}
