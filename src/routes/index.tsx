import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { useFinance } from "@/lib/finance-store";
import {
  ACCOUNT_TYPE_LABEL,
  accountBalance,
  formatIDR,
  totalBalance,
  type AccountType,
} from "@/lib/finance";
import { ChevronRight, Wallet, Landmark, Smartphone, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Duit & Catatan — Finance Tracker Offline" },
      {
        name: "description",
        content: "Catat pemasukan, pengeluaran, transfer, dan utang. Semua data tersimpan di HP kamu dan tetap jalan tanpa internet.",
      },
    ],
  }),
  component: HomePage,
});

const ICONS: Record<AccountType, typeof Wallet> = {
  cash: Wallet,
  bank: Landmark,
  ewallet: Smartphone,
};

function HomePage() {
  // Kita ambil replaceAll untuk menyimpan urutan baru ke database
  const { data, ready, replaceAll } = useFinance();
  
  // State untuk melacak item yang sedang ditarik dan posisinya
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState<number | null>(null);

  // Fungsi saat akun mulai ditahan & ditarik
  const handleDragStart = (index: number) => {
    dragItem.current = index;
    setIsDragging(index);
  };

  // Fungsi saat akun melewati akun lain
  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  // Fungsi saat akun dilepas (drop)
  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      // Buat salinan data akun
      const _accounts = [...data.accounts];
      
      // Hapus akun dari posisi lama, lalu sisipkan ke posisi baru
      const draggedItemContent = _accounts.splice(dragItem.current, 1)[0];
      _accounts.splice(dragOverItem.current, 0, draggedItemContent);

      // Simpan urutan baru ini secara permanen ke database!
      replaceAll({ ...data, accounts: _accounts });
    }
    
    // Reset status
    dragItem.current = null;
    dragOverItem.current = null;
    setIsDragging(null);
  };

  return (
    <AppShell>
      <h1 className="sr-only">Finance tracker Duit &amp; Catatan</h1>
      
      <Panel className="mb-4 text-center">
        <p className="hand text-xl text-ink/70">total saldo</p>
        <p className="mt-1 text-3xl font-extrabold text-primary">
          {formatIDR(ready ? totalBalance(data) : 0)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {data.accounts.length} akun · tersimpan di HP kamu
        </p>
      </Panel>
      
      <Panel title="akun kamu">
        {data.accounts.length === 0 ? (
          <EmptyNote>Belum ada akun. Pergi ke Pengaturan (ikon gir di kanan atas) untuk menambah akun pertamamu!</EmptyNote>
        ) : (
          <ul className="space-y-1">
            {data.accounts.map((a, index) => {
              const Icon = ICONS[a.type];
              return (
                <li
                  key={a.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className={cn(
                    "flex items-center gap-1 rounded-md border-b border-ink/10 px-1 py-1 transition-all cursor-grab active:cursor-grabbing",
                    isDragging === index ? "opacity-40 bg-ink/5 scale-[0.98]" : "hover:bg-muted"
                  )}
                >
                  {/* Ikon Grip (Titik-titik) penanda bisa digeser */}
                  <div className="p-1 text-ink/20 hover:text-ink/50 transition-colors">
                    <GripVertical className="size-5" />
                  </div>
                  
                  <Link
                    to="/accounts/$accountId"
                    params={{ accountId: a.id }}
                    className="flex min-w-0 flex-1 items-center gap-3 py-1.5"
                  >
                    <span className="rounded-md bg-sky p-2 text-ink shrink-0">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{a.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {ACCOUNT_TYPE_LABEL[a.type]}
                      </span>
                    </span>
                    <span className="font-bold text-ink shrink-0">{formatIDR(accountBalance(a, data))}</span>
                    <ChevronRight className="size-4 text-ink/40 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </AppShell>
  );
}