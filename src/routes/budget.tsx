import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { AppShell } from "@/components/finance/AppShell";
import { Panel, EmptyNote } from "@/components/finance/Panel";
import { Field, TextInput, SelectInput, PrimaryButton } from "@/components/finance/fields";
import { useFinance } from "@/lib/finance-store";
import { formatIDR, monthKey, todayISO } from "@/lib/finance";

export const Route = createFileRoute("/budget")({
  head: () => ({
    meta: [{ title: "Kebutuhan Bulanan | Duit & Catatan" }],
  }),
  component: BudgetPage,
});

type NeedItem = { id: string; category: string; name: string; price: number; duration: number };

const CATEGORIES = [
  "Kebutuhan Sehari-hari",
  "Kebersihan",
  "Sembako",
  "Kecantikan",
  "Transportasi",
  "Lainnya"
];

function BudgetPage() {
  const { data } = useFinance();
  
  // Load data kebutuhan dari local storage
  const [needs, setNeeds] = useState<NeedItem[]>(() => {
    try {
      const saved = localStorage.getItem("pocket_pal_needs");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Simpan jika ada perubahan
  useEffect(() => {
    localStorage.setItem("pocket_pal_needs", JSON.stringify(needs));
  }, [needs]);

  // State Form
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("1");

  const addNeed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || !duration) return;
    
    // Ganti koma dengan titik untuk desimal masa pakai
    const parsedDuration = Number(duration.replace(',', '.')); 
    if (parsedDuration <= 0) return;

    const newItem: NeedItem = {
      id: Math.random().toString(36).substring(7),
      category: cat,
      name,
      price: Number(price),
      duration: parsedDuration
    };
    
    setNeeds([...needs, newItem]);
    setName("");
    setPrice("");
  };

  const removeNeed = (id: string) => {
    setNeeds(needs.filter(n => n.id !== id));
  };

  // Kalkulasi Budget vs Expense
  const totalBudget = needs.reduce((sum, item) => sum + (item.price / item.duration), 0);
  const currentMonth = monthKey(todayISO());
  
  const currentExpenses = data.transactions
    .filter(t => t.type === "expense" && monthKey(t.date) === currentMonth)
    .reduce((sum, t) => sum + t.amount, 0);

  const isOver = currentExpenses > totalBudget;
  const diff = Math.abs(currentExpenses - totalBudget);

  // Mengelompokkan item berdasarkan kategori
  const grouped = useMemo(() => {
    const map = new Map<string, NeedItem[]>();
    needs.forEach(n => {
      map.set(n.category, [...(map.get(n.category) || []), n]);
    });
    return Array.from(map.entries());
  }, [needs]);

  return (
    <AppShell>
      <Panel title="Biaya Hidup per Bulan">
        
        {/* --- KOTAK STATUS PERINGATAN --- */}
        <div className={`mb-5 p-4 rounded-lg border-2 ${isOver ? 'border-red-500 bg-red-100' : 'border-green-500 bg-green-100'}`}>
          <h3 className="hand text-xl text-center mb-2 font-bold text-ink">Bulan Ini ({currentMonth})</h3>
          <div className="flex justify-between text-base mb-1 text-ink">
            <span>Estimasi Budget:</span>
            <span className="font-bold">{formatIDR(totalBudget)}</span>
          </div>
          <div className="flex justify-between text-base mb-3 text-ink">
            <span>Pengeluaran Aktual:</span>
            <span className="font-bold">{formatIDR(currentExpenses)}</span>
          </div>
          
          <div className={`text-center font-bold text-lg p-2 rounded border-2 ${isOver ? 'bg-red-200 text-red-900 border-red-300' : 'bg-green-200 text-green-900 border-green-300'}`}>
            {isOver ? `OVERBUDGET: ${formatIDR(diff)} ⚠️` : `SISA BUDGET: ${formatIDR(diff)} ✅`}
          </div>
        </div>

        {/* --- FORM TAMBAH KEBUTUHAN --- */}
        <form onSubmit={addNeed} className="space-y-3 mb-6 p-3 bg-card border-2 border-ink/20 rounded-md">
          <h3 className="hand text-lg text-ink/80">Tambah List Kebutuhan</h3>
          
          <Field label="Kategori">
            <SelectInput value={cat} onChange={e => setCat(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </SelectInput>
          </Field>
          
          <Field label="Nama Barang/Kebutuhan">
            <TextInput value={name} onChange={e => setName(e.target.value)} required />
          </Field>
          
          <div className="flex gap-2">
            <div className="flex-1">
              <Field label="Harga (Rp)">
                <TextInput inputMode="numeric" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9]/g, ''))} required />
              </Field>
            </div>
            <div className="w-1/3">
              <Field label="Masa Pakai (Bln)">
                <TextInput inputMode="decimal" value={duration} onChange={e => setDuration(e.target.value)} required />
              </Field>
            </div>
          </div>
          
          <PrimaryButton type="submit">Tambah Kebutuhan</PrimaryButton>
        </form>

        {/* --- DAFTAR KEBUTUHAN PER KATEGORI --- */}
        {grouped.length === 0 ? (
           <EmptyNote>Belum ada daftar kebutuhan. Tambahkan di atas!</EmptyNote>
        ) : (
          <div className="space-y-4">
            {grouped.map(([category, items]) => {
              const catTotal = items.reduce((sum, item) => sum + (item.price / item.duration), 0);
              
              return (
                <div key={category} className="border-2 border-ink/20 rounded-md overflow-hidden bg-background">
                  
                  {/* Header Kategori */}
                  <div className="bg-primary/20 px-3 py-2 flex justify-between items-center border-b-2 border-ink/20">
                    <span className="font-bold text-sm text-ink">{category}</span>
                    <span className="font-bold text-sm text-ink">{formatIDR(catTotal)}/bln</span>
                  </div>
                  
                  {/* Item di dalam Kategori */}
                  <div className="p-2 space-y-2">
                    {items.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm border-b border-ink/10 pb-2 last:border-0 last:pb-0">
                        <div className="flex-1">
                          <p className="font-bold text-ink">{item.name}</p>
                          <p className="text-xs text-ink/60">{formatIDR(item.price)} untuk {item.duration} bln</p>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <span className="font-bold text-ink">{formatIDR(item.price / item.duration)}</span>
                          <button onClick={() => removeNeed(item.id)} className="text-red-600 font-bold px-1 text-lg" title="Hapus">
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}