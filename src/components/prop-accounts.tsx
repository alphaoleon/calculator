import { useEffect, useState, useSyncExternalStore } from "react";
import { Trash2 } from "lucide-react";
import { Button, Signed } from "@/components/ui";
import { cn } from "@/lib/cn";
import { useBook } from "@/lib/book-store";
import { fmtIndex, fmtUsd } from "@/lib/format";
import {
  ACCOUNT_SIZES,
  DEFAULT_PRESETS,
  TEMPLATES,
  accountsFromTemplate,
  accountCash,
  applyDiscount,
  applyPreset,
  applySide,
  autoSync,
  bufferLeft,
  collectivePassMove,
  feeUsd,
  fuzzWide,
  getLoopSettings,
  isBlown,
  isPassed,
  loadPresets,
  LOOP_FALLBACK,
  loopKpis,
  makeAccount,
  maxDdUsd,
  orderPrices,
  positionSign,
  referenceEntry,
  rotateBook,
  safetyStop,
  savePresets,
  setLoopSettings,
  subscribeLoop,
  withEntry,
  type AccountSize,
  type FirmPreset,
  type SideMode,
} from "@/lib/hydra-loop";
import { useMarket } from "@/lib/market-store";
import type { PropAccount } from "@/lib/types";

export function PropAccounts({ percentMode }: { percentMode: boolean }) {
  const currency = useBook((state) => state.currency);
  const accounts = useBook((state) => state.props[currency]);
  const setProps = useBook((state) => state.setProps);
  const patchProp = useBook((state) => state.patchProp);
  const removeProp = useBook((state) => state.removeProp);
  const index = useMarket((state) => state.index);
  const settings = useSyncExternalStore(subscribeLoop, getLoopSettings, () => LOOP_FALLBACK);
  const [presets, setPresets] = useState<FirmPreset[]>(DEFAULT_PRESETS);
  const [warning, setWarning] = useState("");
  const [left, setLeft] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [bank, setBank] = useState({ cash: 500, fails: 0 });
  const [bankReady, setBankReady] = useState(false);
  const entry = referenceEntry(percentMode, index, settings.entry);
  const preset = presets.find((row) => row.id === "hn-mkt") ?? presets[0];

  useEffect(() => {
    setPresets(loadPresets());
    setBank(loadBank());
    setBankReady(true);
  }, []);

  useEffect(() => {
    if (!bankReady) return;
    window.localStorage.setItem(BANK_KEY, JSON.stringify(bank));
  }, [bank, bankReady]);

  useEffect(() => {
    if (left == null) return;
    if (left <= 0) {
      setLeft(null);
      setReady(true);
      beep();
      return;
    }
    const timer = window.setTimeout(() => setLeft((value) => (value == null ? null : value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [left]);

  const viewed = accounts.map((account) => withEntry(account, entry));

  const write = (next: PropAccount[], note = "") => {
    setWarning(note);
    setProps(currency, next);
  };

  const resync = (partial: { extra?: number; discount?: number; split?: number }) => {
    const next = {
      ...settings,
      extra: partial.extra ?? settings.extra,
      discount: partial.discount ?? settings.discount,
      split: partial.split ?? settings.split,
    };
    setLoopSettings({ extra: next.extra, discount: next.discount, split: next.split });
    const priced = applyDiscount(viewed, next.discount).map((account) =>
      account.phase === "funded" ? { ...account, split: next.split } : account,
    );
    if (!priced.some((account) => account.positionUsd !== 0)) {
      write(priced);
      return;
    }
    const result = autoSync(priced, next.sl, next.extra, next.side);
    write(stampSize(result.accounts, entry), result.warning);
  };

  const clash = firmClash(viewed);
  const kpis = loopKpis(viewed, entry, settings.sl, settings.side);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3 px-3 py-3">
        <div>
          <h2 className="text-sm font-semibold">Prop accounts</h2>
          <p className="mt-1 max-w-3xl text-xs text-muted">
            Short oder Long über den Richtungs-Schalter. Die Fee geht sofort vom Puffer ab und auf das Target drauf.
            Size ist Position $ / Entry. Live-Index
            {index > 0 ? ` ${fmtIndex(index)}` : ""}.
          </p>
        </div>
        <Button
          onClick={() => {
            if (!preset) return;
            write([...accounts, makeAccount("challenge", 10_000, preset)]);
          }}
        >
          Eval dazu
        </Button>
      </div>

      <div className="px-3 pb-3">
        <label className="block text-xs text-muted">
          SL-Move bis Eval-Tod {settings.side === "evals-short" ? "+" : "−"}
          {settings.sl.toFixed(2)}%
          <input
            type="range"
            min={0.2}
            max={3}
            step={0.05}
            value={settings.sl}
            className="mt-3 w-full accent-accent"
            onChange={(event) => setLoopSettings({ sl: Number(event.target.value) })}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2 px-3 pb-3">
        <Button
          tone="accent"
          onClick={() => {
            const result = autoSync(applyDiscount(viewed, settings.discount), settings.sl, settings.extra, settings.side);
            write(stampSize(result.accounts, entry), result.warning);
          }}
        >
          Auto-Sync Positionsgrößen
        </Button>
        <Button
          onClick={() => write(stampSize(fuzzWide(applyDiscount(viewed, settings.discount), entry, settings.sl, settings.side), entry), "Fuzzing ±0,8% bis ±1,5%.")}
        >
          Fuzzing (±1.2%)
        </Button>
        <Button
          onClick={() => {
            setReady(false);
            setLeft(35 + Math.floor(Math.random() * 21));
          }}
        >
          {left != null ? `Stealth ${left}s` : ready ? "Jetzt nächstes Konto" : "Stealth-Countdown (45s)"}
        </Button>
        {accounts.length > 0 ? (
          <Button onClick={() => write([])}>Tabelle leeren</Button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
        <span className="text-xs text-muted">Setup-Richtung</span>
        <div className="flex rounded-full bg-bg p-1" role="group" aria-label="Setup-Richtung">
          {(
            [
              ["evals-short", "Evals SHORT / Funded LONG"],
              ["evals-long", "Evals LONG / Funded SHORT"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                if (id === settings.side) return;
                setLoopSettings({ side: id });
                write(stampSize(applySide(viewed, id), entry));
              }}
              className={cn("h-8 rounded-full px-3 text-xs", settings.side === id ? "bg-fg text-bg" : "text-muted")}
            >
              {label}
            </button>
          ))}
        </div>
        {TEMPLATES.map((template) => (
          <Button
            key={template.id}
            onClick={() => {
              if (!preset) return;
              const built = applyDiscount(
                accountsFromTemplate(template.rows, preset).map((account) =>
                  account.phase === "funded" ? { ...account, split: settings.split } : account,
                ),
                settings.discount,
              );
              const result = autoSync(
                built.map((account) => withEntry(account, entry)),
                settings.sl,
                settings.extra,
                settings.side,
              );
              write(stampSize(result.accounts, entry), result.warning || template.label);
            }}
          >
            {template.label}
          </Button>
        ))}
        <NumberField label="Eval-Rabatt %" value={settings.discount} min={0} max={25} step={1} onCommit={(discount) => resync({ discount })} />
        <NumberField label="Funded Split %" value={settings.split} min={50} max={100} step={1} onCommit={(split) => resync({ split })} />
        <NumberField label="Over-Hedge Extra $" value={settings.extra} min={0} max={200} step={5} onCommit={(extra) => resync({ extra })} />
      </div>
      {clash ? (
        <p className="mx-3 mb-3 rounded-xl border border-short bg-short/10 px-3 py-2 text-sm text-short">
          ACHTUNG: Gleiche Prop-Firm mehrfach aktiv – Copy-Trading-Sperre!
        </p>
      ) : null}
      {warning ? <p className="px-3 pb-2 text-sm text-preview">{warning}</p> : null}

      <details className="mx-3 mb-3 rounded-xl bg-bg px-3 py-2 text-sm">
        <summary className="cursor-pointer text-muted">Firmen-Gebühren</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {presets.map((row) => (
            <label key={row.id} className="text-xs text-muted">
              {row.name}
              <input
                type="number"
                min={0}
                step={0.001}
                className="mt-1 h-10 w-full rounded-xl border border-line bg-surface px-2 text-right font-mono text-sm"
                value={row.rtPct}
                onChange={(event) => {
                  const rtPct = Number(event.target.value);
                  if (!Number.isFinite(rtPct)) return;
                  const next = presets.map((item) => (item.id === row.id ? { ...item, rtPct } : item));
                  setPresets(next);
                  savePresets(next);
                  write(accounts.map((account) => (account.presetId === row.id ? { ...account, rtFeePct: rtPct } : account)));
                }}
              />
            </label>
          ))}
        </div>
      </details>

      <div className="overflow-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left text-xs">
          <thead>
            <tr className="text-faint">
              <th className="px-3 py-2 font-medium">An</th>
              <th className="px-2 py-2 font-medium text-fg">Prop</th>
              <th className="px-2 py-2 font-medium">Firma</th>
              <th className="px-2 py-2 font-medium">Größe</th>
              <th className="px-2 py-2 font-medium">Position $</th>
              <th className="px-2 py-2 font-medium">Hebel</th>
              <th className="px-2 py-2 font-medium">Size (Coins/Lots)</th>
              <th className="px-2 py-2 font-medium">Fee</th>
              <th className="px-2 py-2 font-medium">SL Kurs $</th>
              <th className="px-2 py-2 font-medium">TP Kurs $</th>
              <th className="px-2 py-2 font-medium">Kosten $</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {viewed.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-3 py-4 text-sm text-muted">
                  Keine Konten. Ein Template lädt den Loop und setzt die Größen.
                </td>
              </tr>
            ) : (
              viewed.map((account, index) => (
                <Row
                  key={account.id}
                  account={account}
                  label={`Prop ${index + 1}`}
                  entry={entry}
                  side={settings.side}
                  slPct={settings.sl}
                  stopMove={collectivePassMove(viewed, settings.side)}
                  presets={presets}
                  onPatch={(patch) => patchProp(currency, account.id, patch)}
                  onRemove={() => removeProp(currency, account.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <Bankroll
        cash={bank.cash}
        fails={bank.fails}
        net={kpis.netAtFail}
        failMove={kpis.failMove}
        passMove={kpis.passMove}
        onCash={(cash) => setBank((prev) => ({ ...prev, cash }))}
        onFail={() => setBank((prev) => ({ cash: Math.round((prev.cash + kpis.netAtFail) * 100) / 100, fails: prev.fails + 1 }))}
        onPass={() => {
          write(rotateBook(viewed, settings.split), "Rotation gespeichert.");
          setBank((prev) => ({ ...prev, fails: 0 }));
        }}
      />
    </section>
  );
}

function stampSize(accounts: PropAccount[], entry: number): PropAccount[] {
  return accounts.map((account) => ({
    ...account,
    size: entry > 0 ? account.positionUsd / entry : account.size,
  }));
}

function Row({
  account,
  label,
  entry,
  side,
  slPct,
  stopMove,
  presets,
  onPatch,
  onRemove,
}: {
  account: PropAccount;
  label: string;
  entry: number;
  side: SideMode;
  slPct: number;
  stopMove: number | null;
  presets: FirmPreset[];
  onPatch: (patch: Partial<PropAccount>) => void;
  onRemove: () => void;
}) {
  const coins = entry > 0 ? account.positionUsd / entry : 0;
  const leverage = account.account > 0 ? Math.abs(account.positionUsd) / account.account : 0;
  const cash = accountCash(account, account.entry);
  const passed = isPassed(account, account.entry);
  const blown = isBlown(account, account.entry);
  const status = deskStatus(account, blown, passed);
  const buffer = account.phase === "funded" ? bufferLeft(account, account.entry) : null;
  const orders = orderPrices(account, entry, slPct, side, stopMove);
  const guard = account.phase === "funded" && account.enabled && stopMove != null && bufferLeft(account, entry * (1 + stopMove)) < 50;
  const slPrice = guard ? safetyStop(account, entry) ?? orders.sl : orders.sl;
  const fee = feeUsd(account);

  return (
    <tr className="border-t border-line">
      <td className="px-3 py-2">
        <input
          type="checkbox"
          className="h-4 w-4 accent-accent"
          checked={account.enabled}
          aria-label={`${label} an`}
          onChange={(event) => onPatch({ enabled: event.target.checked })}
        />
      </td>
      <td className="px-2 py-2">
        <button
          type="button"
          className={cn(
            "h-10 rounded-full border border-line px-3 text-xs",
            account.phase === "funded" ? "text-long" : "text-accent",
          )}
          onClick={() => {
            const phase = account.phase === "funded" ? "challenge" : "funded";
            const current = presets.find((row) => row.id === account.presetId) ?? presets[0];
            if (!current) {
              onPatch({ phase });
              return;
            }
            onPatch({ ...applyPreset({ ...account, phase, tag: "" }, current, nearestSize(account.account)) });
          }}
        >
          {label}
        </button>
      </td>
      <td className="px-2 py-2">
        <select
          className="h-10 max-w-48 rounded-xl border border-line bg-bg px-2"
          value={account.presetId}
          aria-label={`Firma für ${label}`}
          onChange={(event) => {
            const next = presets.find((row) => row.id === event.target.value);
            if (!next) return;
            onPatch(applyPreset(account, next, nearestSize(account.account)));
          }}
        >
          {presets.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
          {account.presetId === "" ? <option value="">Eigene Fee</option> : null}
        </select>
      </td>
      <td className="px-2 py-2">
        <select
          className="h-10 rounded-xl border border-line bg-bg px-2"
          value={nearestSize(account.account)}
          aria-label={`Größe ${label}`}
          onChange={(event) => {
            const size = Number(event.target.value) as AccountSize;
            const current = presets.find((row) => row.id === account.presetId) ?? presets[0];
            if (!current) return;
            onPatch(applyPreset(account, current, size));
          }}
        >
          {ACCOUNT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size / 1000}k
            </option>
          ))}
        </select>
        <p className="mt-1 text-faint">DD {fmtUsd(maxDdUsd(account))}</p>
      </td>
      <UsdField account={account} label={label} onPatch={onPatch} />
      <td className="px-2 py-2">
        <input
          className="h-10 w-20 rounded-xl border border-line bg-bg px-2 text-right font-mono"
          defaultValue={leverage ? leverage.toFixed(2) : ""}
          key={`${account.id}-${account.positionUsd}`}
          inputMode="decimal"
          aria-label={`Hebel ${label}`}
          onBlur={(event) => {
            const next = Number(event.target.value);
            if (!(next >= 0) || !Number.isFinite(next)) return;
            const sign = positionSign(account.phase, side);
            onPatch({ positionUsd: sign * next * account.account });
          }}
        />
      </td>
      <CopyCell value={entry > 0 ? coins : null} text={entry > 0 ? `${coins >= 0 ? "" : "−"}${Math.abs(coins).toFixed(4)}` : "—"} />
      <td className="px-2 py-2 font-mono tabular-nums">
        {account.phase === "challenge"
          ? `${fmtUsd(fee / 2)} (Open ${(account.rtFeePct / 2).toFixed(3)}%)`
          : `${fmtUsd(fee)} (${account.rtFeePct.toFixed(2)}%)`}
      </td>
      <CopyCell value={slPrice} text={slPrice != null ? fmtIndex(slPrice) : "—"} warn={guard} />
      <CopyCell value={orders.tp} text={orders.tp != null ? fmtIndex(orders.tp) : "—"} />
      <td className="px-2 py-2 font-mono tabular-nums">{account.phase === "challenge" ? fmtUsd(account.cost) : "—"}</td>
      <td className="px-2 py-2">
        <p className={cn(blown && "text-short", passed && "text-long")}>{status}</p>
        <Signed value={cash} text={fmtUsd(cash, true)} />
        {buffer != null ? <p className="text-faint">Puffer {fmtUsd(buffer, true)}</p> : null}
      </td>
      <td className="px-2 py-2">
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted hover:text-short"
          aria-label={`${label} entfernen`}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function UsdField({ account, label, onPatch }: { account: PropAccount; label: string; onPatch: (patch: Partial<PropAccount>) => void }) {
  const [text, setText] = useState(account.positionUsd ? String(Math.round(account.positionUsd)) : "");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    setText(account.positionUsd ? String(Math.round(account.positionUsd)) : "");
  }, [account.positionUsd]);
  return (
    <td className="px-2 py-2">
      <input
        className="h-10 w-28 rounded-xl border border-line bg-bg px-2 text-right font-mono"
        value={text}
        inputMode="decimal"
        aria-label={`Position USD ${label}`}
        onClick={() => {
          void navigator.clipboard?.writeText(copyPlain(account.positionUsd));
          setCopied(true);
          window.setTimeout(() => setCopied(false), 900);
        }}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const next = Number(text);
          if (!Number.isFinite(next)) {
            setText(account.positionUsd ? String(Math.round(account.positionUsd)) : "");
            return;
          }
          onPatch({ positionUsd: next });
        }}
      />
      {copied ? <p className="text-long">Kopiert!</p> : null}
    </td>
  );
}

function nearestSize(size: number): AccountSize {
  return ACCOUNT_SIZES.reduce((best, item) => (Math.abs(item - size) < Math.abs(best - size) ? item : best));
}

const BANK_KEY = "position-builder.bankroll.v1";

function loadBank(): { cash: number; fails: number } {
  try {
    const raw = window.localStorage.getItem(BANK_KEY);
    if (!raw) return { cash: 500, fails: 0 };
    const parsed = JSON.parse(raw) as { cash?: number; fails?: number };
    return {
      cash: typeof parsed.cash === "number" && Number.isFinite(parsed.cash) ? parsed.cash : 500,
      fails: typeof parsed.fails === "number" && Number.isFinite(parsed.fails) ? parsed.fails : 0,
    };
  } catch {
    return { cash: 500, fails: 0 };
  }
}

function firmClash(accounts: PropAccount[]): boolean {
  const ids = accounts.filter((account) => account.enabled).map((account) => account.presetId || account.name);
  return ids.some((id, index) => ids.indexOf(id) !== index);
}

function deskStatus(account: PropAccount, blown: boolean, passed: boolean): string {
  if (account.tag === "cooldown") return "Cooldown";
  if (account.tag === "trader") return "Trader (Cash-Kuh)";
  if (blown) return "Tot";
  if (passed) return "EVAL PASSED";
  if (account.phase === "challenge") return "Eval läuft";
  if (account.tag === "active") return "Funded (Aktiv)";
  return "Funded";
}

function copyPlain(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(rounded);
}

function beep(): void {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.15);
  osc.onended = () => void ctx.close();
}

function CopyCell({ value, text, warn }: { value: number | null; text: string; warn?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <td className="px-2 py-2">
      <button
        type="button"
        className={cn("text-left font-mono tabular-nums", warn && "rounded-md px-1 text-preview")}
        disabled={value == null}
        onClick={() => {
          if (value == null) return;
          void navigator.clipboard?.writeText(copyPlain(value));
          setCopied(true);
          window.setTimeout(() => setCopied(false), 900);
        }}
      >
        {text}
        {copied ? <span className="ml-1 text-long">Kopiert!</span> : null}
      </button>
    </td>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <label className="text-xs text-muted">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        className="mt-1 h-8 w-24 rounded-xl border border-line bg-bg px-2 text-right font-mono text-sm"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const next = Number(text);
          if (!Number.isFinite(next)) {
            setText(String(value));
            return;
          }
          onCommit(Math.min(max, Math.max(min, next)));
        }}
      />
    </label>
  );
}

function Bankroll({
  cash,
  fails,
  net,
  failMove,
  passMove,
  onCash,
  onFail,
  onPass,
}: {
  cash: number;
  fails: number;
  net: number;
  failMove: number;
  passMove: number;
  onCash: (cash: number) => void;
  onFail: () => void;
  onPass: () => void;
}) {
  const failLabel = `${failMove >= 0 ? "+" : ""}${failMove.toFixed(2)}%`;
  const passLabel = `${passMove >= 0 ? "+" : ""}${passMove.toFixed(2)}%`;
  return (
    <section className="mx-3 mb-3 mt-3 rounded-xl bg-bg p-3">
      <h3 className="text-sm font-semibold">Mein Aufstiegs- & Rotations-Tracker</h3>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-xs text-muted">
          Wallet Cash $
          <input
            type="number"
            step={10}
            className="mt-1 h-10 w-32 rounded-xl border border-line bg-surface px-2 text-right font-mono text-sm"
            value={cash}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) onCash(next);
            }}
          />
        </label>
        <p className="text-xs text-muted">Fehlversuche im aktuellen Zyklus {fails}</p>
        <Button tone="buy" onClick={onFail}>
          Evals im SL ({failLabel}) → Payout buchen
        </Button>
        <Button tone="accent" onClick={onPass}>
          Evals bestanden ({passLabel}) → Rotation!
        </Button>
        <p className="text-xs text-faint">Netto dieses Versuchs {fmtUsd(net, true)}</p>
      </div>
    </section>
  );
}
