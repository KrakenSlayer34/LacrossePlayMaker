import LacrosseField from "@/components/LacrosseField";
import Header from "@/components/header";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <main className="flex-1">
        <LacrosseField />
      </main>
    </div>
  );
}