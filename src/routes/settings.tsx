import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel } from "@/components/finance/Panel";
import { GhostButton, PrimaryButton } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";
import { emptyData, normalize, todayISO } from "@/lib/finance";
export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Backup & Pengaturan | Duit & Catatan" },
      {
        name: "description",
        content:
          "Export semua data keuangan jadi satu file .json, atau import kembali saat pindah HP.",
      },
      { property: "og:title", content: "Backup & Pengaturan | Duit & Catatan" },
      { property: "og:description", content: "Export dan import backup data keuangan kamu." },
    ],
  }),
  component: SettingsPage,
});
function SettingsPage() {
  const { data, replaceAll } = useFinance();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");
  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-duit-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Backup berhasil diunduh.");
  }
  async function importData(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const next = normalize(parsed);
      if (
        confirm(
          `Import ${next.accounts.length} akun, ${next.transactions.length} transaksi, ${next.debts.length} debt? Data sekarang akan diganti.`,
        )
      ) {
        replaceAll(next);
        setMsg("Data berhasil di-import.");
      }
    } catch {
      setMsg("File tidak valid. Pastikan itu file backup .json dari app ini.");
    }
  }
  return (
    <AppShell>
      <Panel title="backup data" className="mb-4">
        <p className="text-sm text-muted-foreground">
          Semua data disimpan di HP kamu (localStorage). Simpan backup rutin supaya aman kalau ganti
          HP atau data browser terhapus.
        </p>
        <div className="mt-3 space-y-2">
          <PrimaryButton type="button" onClick={exportData}>
            export .json
          </PrimaryButton>
          <GhostButton type="button" className="w-full" onClick={() => fileRef.current?.click()}>
            import .json
          </GhostButton>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importData(file);
              e.target.value = "";
            }}
          />
        </div>
        {msg ? <p className="hand mt-3 text-lg text-primary">{msg}</p> : null}
      </Panel>
      <Panel title="pasang di homescreen" className="mb-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-ink/80">
          <li>Buka link app ini di Safari (iPhone) atau Chrome (Android).</li>
          <li>Tekan tombol Share / menu titik tiga.</li>
          <li>Pilih "Add to Home Screen".</li>
          <li>Buka dari icon-nya — fullscreen dan tetap jalan tanpa internet.</li>
        </ol>
      </Panel>
      <Panel title="zona bahaya">
        <GhostButton
          type="button"
          className="w-full border-primary text-primary"
          onClick={() => {
            if (confirm("Hapus SEMUA data di HP ini? Tindakan ini tidak bisa dibatalkan.")) {
              replaceAll(emptyData);
              setMsg("Semua data dihapus.");
            }
          }}
        >
          hapus semua data
        </GhostButton>
      </Panel>
    </AppShell>
  );
}