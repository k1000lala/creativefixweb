// Tomar hooks desde React global (CDN)
const { useEffect, useMemo, useState } = React;

/**
 * Prototipo de página para reservas (sin base de datos)
 * - Calendario con disponibilidad local (localStorage)
 * - Selección de check-in y check-out
 * - Cálculo de noches y total estimado (precio por noche configurable)
 * - Confirmación con código de reserva (simulado)
 * - Exportación CSV de reservas (simulado)
 * - Botón para limpiar datos locales
 *
 * Notas:
 * - No usa librerías externas, solo React + Tailwind (estilos por CDN)
 * - Todo se guarda en localStorage para que persista entre recargas
 */

// ------------------------ Utilidades de fecha ------------------------
const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return startOfDay(x);
};
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const firstWeekdayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0=Dom
const toKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const dateRange = (start, end) => {
  if (!start || !end || end <= start) return [];
  const out = [];
  for (let d = startOfDay(start); d < end; d = addDays(d, 1)) out.push(d);
  return out;
};
const diffDays = (a, b) => Math.max(0, Math.round((startOfDay(b) - startOfDay(a)) / (1000 * 60 * 60 * 24)));

// ------------------------ Componentes ------------------------
function Header() {
  return (
    <header className="px-6 py-8 bg-gradient-to-r from-sky-50 to-cyan-50 border-b">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Sistema de Reservas · Cabañas</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Prototipo sin base de datos. Permite simular disponibilidad, seleccionar fechas, calcular noches y generar un código de reserva.
        </p>
      </div>
    </header>
  );
}

function Stat({ label, value }) {
  return (
    <div className="p-4 rounded-2xl border bg-white shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-sm text-slate-600">
      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-emerald-200 border border-emerald-400 inline-block"/>Disponible</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-rose-200 border border-rose-400 inline-block"/>Reservado</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-amber-200 border border-amber-400 inline-block"/>Rango seleccionado</div>
      <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-sky-200 border border-sky-400 inline-block"/>Hoy</div>
    </div>
  );
}

function MonthCalendar({ year, month, bookedSet, checkIn, checkOut, onPick }) {
  const weeks = useMemo(() => {
    const dim = daysInMonth(year, month);
    const start = firstWeekdayOfMonth(year, month); // 0..6 (Dom..Sáb)
    const days = [];
    for (let i = 0; i < start; i++) days.push(null);
    for (let d = 1; d <= dim; d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    const out = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    return out;
  }, [year, month]);

  const todayKey = toKey(startOfDay(new Date()));
  const inRange = (d) => (checkIn && checkOut ? d >= checkIn && d < checkOut : false);

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 text-xs font-medium text-slate-500 mb-2">
        {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map((w) => (
          <div key={w} className="px-1 py-1 text-center">{w}</div>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        {weeks.map((row, idx) => (
          <div key={idx} className="grid grid-cols-7 gap-1">
            {row.map((d, j) => {
              if (!d) return <div key={j} className="h-10"/>;
              const key = toKey(d);
              const isBooked = bookedSet.has(key);
              const isToday = key === todayKey;
              const isSelected = (checkIn && isSameDay(d, checkIn)) || (checkOut && isSameDay(d, checkOut)) || inRange(d);

              const base = isBooked
                ? "bg-rose-200 border-rose-400 cursor-not-allowed"
                : isSelected
                ? "bg-amber-200 border-amber-400"
                : isToday
                ? "bg-sky-200 border-sky-400"
                : "bg-emerald-200 border-emerald-400 hover:bg-emerald-300";

              return (
                <button
                  key={j}
                  className={`h-10 rounded-md border text-sm flex items-center justify-center ${base}`}
                  onClick={() => !isBooked && onPick(d)}
                  title={key}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function Calendar({ bookedDates, setBookedDates, checkIn, setCheckIn, checkOut, setCheckOut }) {
  const [cursor, setCursor] = useState(startOfDay(new Date()));
  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates]);

  const handlePick = (d) => {
    const day = startOfDay(d);
    if (!checkIn || (checkIn && day <= checkIn)) {
      setCheckIn(day);
      setCheckOut(null);
      return;
    }
    setCheckOut(day);
  };

  return (
    <section className="p-4 rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Disponibilidad</h2>
        <div className="flex items-center gap-2">
          <button className="px-2 py-1 rounded-md border hover:bg-slate-50" onClick={() => setCursor(addDays(cursor, -30))}>◀ Mes anterior</button>
          <div className="text-sm min-w-[140px] text-center">
            {cursor.toLocaleString("es-CL", { month: "long", year: "numeric" })}
          </div>
          <button className="px-2 py-1 rounded-md border hover:bg-slate-50" onClick={() => setCursor(addDays(cursor, 30))}>Mes siguiente ▶</button>
        </div>
      </div>

      <Legend />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <MonthCalendar year={year} month={month} bookedSet={bookedSet} checkIn={checkIn} checkOut={checkOut} onPick={handlePick} />
        <MonthCalendar year={month === 11 ? year + 1 : year} month={(month + 1) % 12} bookedSet={bookedSet} checkIn={checkIn} checkOut={checkOut} onPick={handlePick} />
      </div>
    </section>
  );
}

function BookingForm({ checkIn, checkOut, bookedDates, setBookedDates }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [price, setPrice] = useState(55000);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");

  const nights = useMemo(() => (checkIn && checkOut ? diffDays(checkIn, checkOut) : 0), [checkIn, checkOut]);
  const rangeKeys = useMemo(() => (checkIn && checkOut ? dateRange(checkIn, checkOut).map(toKey) : []), [checkIn, checkOut]);

  const hasConflict = useMemo(() => {
    const set = new Set(bookedDates);
    return rangeKeys.some((k) => set.has(k));
  }, [bookedDates, rangeKeys]);

  const total = nights * (Number(price) || 0);

  const handleConfirm = () => {
    setMessage("");
    if (!checkIn || !checkOut) return setMessage("Selecciona check-in y check-out.");
    if (!name || !email || !phone) return setMessage("Completa nombre, correo y teléfono.");
    if (nights <= 0) return setMessage("El rango seleccionado no es válido.");
    if (hasConflict) return setMessage("El rango contiene fechas ya reservadas.");

    const code = `R-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;

    const booking = {
      code, name, email, phone,
      checkIn: toKey(checkIn),
      checkOut: toKey(checkOut),
      nights, price: Number(price), total, notes,
      createdAt: new Date().toISOString(),
    };

    const prev = JSON.parse(localStorage.getItem("bookings") || "[]");
    localStorage.setItem("bookings", JSON.stringify([...prev, booking]));

    const newBooked = Array.from(new Set([...bookedDates, ...rangeKeys]));
    localStorage.setItem("bookedDates", JSON.stringify(newBooked));
    setBookedDates(newBooked);

    setMessage(`Reserva confirmada. Código: ${code}`);
  };

  const disableConfirm = hasConflict || nights <= 0 || !checkIn || !checkOut;

  return (
    <section className="p-4 rounded-2xl border bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Reserva</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Stat label="Check-in" value={checkIn ? toKey(checkIn) : "—"} />
        <Stat label="Check-out" value={checkOut ? toKey(checkOut) : "—"} />
        <Stat label="Noches" value={nights} />
        <Stat label="Total estimado" value={`$${total.toLocaleString("es-CL")}`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="grid gap-3">
          <label className="text-sm">Nombre completo</label>
          <input className="px-3 py-2 border rounded-xl" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Juan Pérez" />
          <label className="text-sm">Correo electrónico</label>
          <input className="px-3 py-2 border rounded-xl" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.cl" />
          <label className="text-sm">Teléfono</label>
          <input className="px-3 py-2 border rounded-xl" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+56 9 ..." />
        </div>

        <div className="grid gap-3">
          <label className="text-sm">Precio por noche (ADR)</label>
          <input type="number" className="px-3 py-2 border rounded-xl" value={price} onChange={(e) => setPrice(e.target.value)} />
          <label className="text-sm">Notas</label>
          <textarea className="px-3 py-2 border rounded-xl" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Necesidades especiales, hora estimada de llegada, etc." />
          {hasConflict ? (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">El rango seleccionado contiene fechas ya reservadas.</div>
          ) : (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">Rango disponible.</div>
          )}
        </div>
      </div>

      {message && <div className="mt-4 text-slate-700 bg-slate-50 border rounded-xl px-3 py-2">{message}</div>}

      <div className="flex flex-wrap gap-3 mt-4">
        <button
          disabled={disableConfirm}
          onClick={handleConfirm}
          className={`px-4 py-2 rounded-xl border shadow-sm ${disableConfirm ? "bg-slate-200 text-slate-500" : "bg-emerald-500 text-white hover:bg-emerald-600"}`}
        >
          Confirmar reserva (simulado)
        </button>
      </div>
    </section>
  );
}

function Tools({ setBookedDates }) {
  const [exportMsg, setExportMsg] = useState("");

  const onExport = () => {
    const bookings = JSON.parse(localStorage.getItem("bookings") || "[]");
    if (!bookings.length) return setExportMsg("No existen reservas para exportar.");
    const headers = ["code","name","email","phone","checkIn","checkOut","nights","price","total","notes","createdAt"];
    const rows = bookings.map((b) => headers.map((h) => (b[h] ?? "")).toString());
    const csv = [headers.toString(), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservas_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMsg("Archivo CSV generado.");
  };

  const onReset = () => {
    localStorage.removeItem("bookings");
    localStorage.removeItem("bookedDates");
    setBookedDates([]);
  };

  return (
    <section className="p-4 rounded-2xl border bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Herramientas</h2>
      <div className="flex flex-wrap gap-3">
        <button onClick={onExport} className="px-4 py-2 rounded-xl border bg-white hover:bg-slate-50 shadow-sm">Exportar reservas (CSV)</button>
        <button onClick={onReset} className="px-4 py-2 rounded-xl border bg-white hover:bg-slate-50 shadow-sm">Limpiar datos locales</button>
      </div>
      {exportMsg && <div className="mt-3 text-sm text-slate-600">{exportMsg}</div>}
      <p className="mt-3 text-sm text-slate-500 max-w-prose">
        Este prototipo guarda los datos en el navegador mediante <strong>localStorage</strong>. No existe conexión a base de datos. La exportación permite llevar los registros a Excel para análisis.
      </p>
    </section>
  );
}

function Footer() {
  return (
    <footer className="px-6 py-8 border-t bg-white">
      <div className="max-w-6xl mx-auto text-sm text-slate-600">
        Versión prototipo · Sin base de datos · Ideal para validar flujo de usuario, recolección de campos y reglas mínimas de negocio.
      </div>
    </footer>
  );
}

function App() {
  const [bookedDates, setBookedDates] = useState([]); // array de YYYY-MM-DD
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);

  useEffect(() => {
    const b = JSON.parse(localStorage.getItem("bookedDates") || "[]");
    setBookedDates(b);
    if (!b.length) {
      const today = startOfDay(new Date());
      const demoStart = addDays(today, 10);
      const demoEnd = addDays(today, 14);
      const sample = dateRange(demoStart, demoEnd).map(toKey);
      localStorage.setItem("bookedDates", JSON.stringify(sample));
      setBookedDates(sample);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Calendar
            bookedDates={bookedDates}
            setBookedDates={setBookedDates}
            checkIn={checkIn}
            setCheckIn={setCheckIn}
            checkOut={checkOut}
            setCheckOut={setCheckOut}
          />
        </div>
        <div className="space-y-6">
          <BookingForm
            checkIn={checkIn}
            checkOut={checkOut}
            bookedDates={bookedDates}
            setBookedDates={setBookedDates}
          />
          <Tools setBookedDates={setBookedDates} />
        </div>
      </main>
      <Footer />
    </div>
  );
}

// Montar la app en #root
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
