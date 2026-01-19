import ConnectionStatus from "../components/ConnectionStatus";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-bold">AIOS Mission Control</h1>
        <ConnectionStatus />
      </main>
    </div>
  );
}
