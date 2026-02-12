import { useEffect, useMemo, useState } from 'react';
import { generateDaySlots } from './defaultData';
import { classifyRecommendations, computeScores } from './scoring';
import { loadData, resetData, saveData } from './storage';
import { Activity, AppDataV1, AppScreen, Family, FamilyAvailabilityDay, Member } from './types';

const ratingKey = (memberId: string, activityId: string) => `${memberId}:${activityId}`;
const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fmtYear = (iso: string) => new Date(`${iso}T00:00:00`).getFullYear();

const tagsForFilter = {
  Anne: (a: Activity) => a.category.includes('Anne') || a.tags.includes('Anne'),
  Food: (a: Activity) => a.category.includes('Food') || a.tags.includes('Food'),
  Outdoor: (a: Activity) => a.tags.includes('Outdoor'),
  'Rainy-day': (a: Activity) => a.tags.includes('Rainy-day'),
};

function App() {
  const [data, setData] = useState<AppDataV1>(() => loadData());
  const [screen, setScreen] = useState<AppScreen>('home');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [tagFilter, setTagFilter] = useState<keyof typeof tagsForFilter | 'All'>('All');
  const [showShare, setShowShare] = useState(false);
  const [newActivity, setNewActivity] = useState({ name: '', category: '', tags: '', togetherFriendly: true });

  useEffect(() => saveData(data), [data]);

  const ensureFamilyAvailability = (families: Family[], slots = data.trip.daySlots) => {
    const next = { ...data.familyAvailability };
    families.forEach((f) => {
      const existing = next[f.id] ?? [];
      const byDate = new Map(existing.map((d) => [d.dateISO, d]));
      next[f.id] = slots.map((slot) => {
        const current = byDate.get(slot.dateISO);
        return {
          dateISO: slot.dateISO,
          amGroupTime: slot.amEnabled ? current?.amGroupTime ?? true : null,
          pmGroupTime: slot.pmEnabled ? current?.pmGroupTime ?? true : null,
        };
      });
    });
    return next;
  };

  useEffect(() => {
    const synced = ensureFamilyAvailability(data.families);
    if (JSON.stringify(synced) !== JSON.stringify(data.familyAvailability)) {
      setData((prev) => ({ ...prev, familyAvailability: synced }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.families.length, data.trip.daySlots.length]);

  const categories = useMemo(() => ['All', ...new Set(data.activities.map((a) => a.category))], [data.activities]);
  const filteredActivities = useMemo(
    () =>
      data.activities.filter((a) => {
        const categoryOk = categoryFilter === 'All' || a.category === categoryFilter;
        const tagOk = tagFilter === 'All' || tagsForFilter[tagFilter](a);
        return categoryOk && tagOk;
      }),
    [data.activities, categoryFilter, tagFilter],
  );

  const scores = useMemo(() => computeScores(data.activities, data.families, data.members, data.ratings), [data]);
  const recs = useMemo(() => classifyRecommendations(scores, data.trip.thresholds, data.families), [scores, data.trip.thresholds, data.families]);

  const completion = useMemo(() => {
    if (!selectedMember || data.activities.length === 0) return 0;
    const count = data.activities.filter((a) => typeof data.ratings[ratingKey(selectedMember, a.id)] === 'number').length;
    return Math.round((count / data.activities.length) * 100);
  }, [selectedMember, data.activities, data.ratings]);

  const addFamily = () => {
    const name = prompt('Family name')?.trim();
    if (!name) return;
    const family: Family = { id: crypto.randomUUID(), name };
    const families = [...data.families, family];
    setData({ ...data, families, familyAvailability: ensureFamilyAvailability(families) });
  };

  const addMember = (familyId: string) => {
    const name = prompt('Member name')?.trim();
    if (!name) return;
    const member: Member = { id: crypto.randomUUID(), familyId, name };
    setData({ ...data, members: [...data.members, member] });
    if (!selectedMember) setSelectedMember(member.id);
  };

  const updateDates = (startDate: string, endDate: string) => {
    if (!startDate || !endDate || startDate > endDate) {
      alert('Please select a valid start and end date.');
      return;
    }
    const slots = generateDaySlots(startDate, endDate);
    const familyAvailability = Object.fromEntries(
      data.families.map((f) => [
        f.id,
        slots.map((d) => ({ dateISO: d.dateISO, amGroupTime: d.amEnabled ? true : null, pmGroupTime: d.pmEnabled ? true : null })),
      ]),
    );

    const validDates = new Set(slots.map((s) => s.dateISO));
    const schedule: AppDataV1['schedule'] = {};
    Object.entries(data.schedule).forEach(([dateISO, row]) => {
      if (!validDates.has(dateISO)) return;
      const slot = slots.find((d) => d.dateISO === dateISO);
      schedule[dateISO] = {
        amActivityId: slot?.amEnabled ? row.amActivityId : undefined,
        pmActivityId: slot?.pmEnabled ? row.pmActivityId : undefined,
      };
    });

    setData({ ...data, trip: { ...data.trip, startDate, endDate, daySlots: slots }, familyAvailability, schedule });
    alert('Dates updated. Schedule and family availability were regenerated, and invalid slots were removed.');
  };

  const setFamilyAvailability = (familyId: string, dateISO: string, slot: 'amGroupTime' | 'pmGroupTime', value: boolean) => {
    const list = data.familyAvailability[familyId] ?? [];
    const next = list.map((d) => (d.dateISO === dateISO ? { ...d, [slot]: value } : d));
    setData({ ...data, familyAvailability: { ...data.familyAvailability, [familyId]: next } });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pei-planner-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows = ['Activity,Category,Group Average,Disagreement,Together Score,Separate Score'];
    scores.forEach((s) => {
      rows.push(`"${s.activity.name}","${s.activity.category}",${s.groupAverage.toFixed(2)},${s.disagreement.toFixed(2)},${s.togetherScore.toFixed(2)},${s.separateScore.toFixed(2)}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pei-planner-scores.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyExportText = async () => {
    const lines = [
      `PEI Planner: ${fmtDate(data.trip.startDate)} (PM) to ${fmtDate(data.trip.endDate)} (AM), ${fmtYear(data.trip.startDate)}`,
      '',
      'Best for all together:',
      ...recs.together.slice(0, 8).map((r, i) => `${i + 1}. ${r.activity.name} (group avg ${r.groupAverage.toFixed(2)})`),
      '',
      'Better as separate family time:',
      ...recs.separate.slice(0, 8).map((r, i) => `${i + 1}. ${r.activity.name} (disagreement ${r.disagreement.toFixed(2)})`),
      '',
      'Schedule:',
      ...data.trip.daySlots.map((d) => {
        const row = data.schedule[d.dateISO] ?? {};
        const am = row.amActivityId ? data.activities.find((a) => a.id === row.amActivityId)?.name ?? 'Unknown' : 'None';
        const pm = row.pmActivityId ? data.activities.find((a) => a.id === row.pmActivityId)?.name ?? 'Unknown' : 'None';
        return `${fmtDate(d.dateISO)} - AM: ${d.amEnabled ? am : 'Disabled'}, PM: ${d.pmEnabled ? pm : 'Disabled'}`;
      }),
    ];
    await navigator.clipboard.writeText(lines.join('\n'));
    alert('Copied recommendations + schedule to clipboard');
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppDataV1;
        if (parsed.version !== 1 || !parsed.trip?.daySlots) throw new Error('Invalid schema');
        setData(parsed);
      } catch {
        alert('Invalid JSON import');
      }
    };
    reader.readAsText(file);
  };

  const navItems: { label: string; screen: AppScreen }[] = [
    { label: 'Home', screen: 'home' },
    { label: 'Families', screen: 'families' },
    { label: 'Rate', screen: 'rate' },
    { label: 'Recommendations', screen: 'recommendations' },
    { label: 'Schedule', screen: 'schedule' },
    { label: 'Export', screen: 'export' },
    { label: 'Settings', screen: 'settings' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">PEI Planner</h1>

      <div className="flex flex-wrap gap-2">
        {navItems.map((item) => (
          <button key={item.label} className={screen === item.screen ? 'bg-blue-600 text-white text-sm' : 'bg-white border text-sm'} onClick={() => setScreen(item.screen)}>
            {item.label}
          </button>
        ))}
      </div>

      {screen === 'home' && (
        <section className="bg-white p-4 rounded border space-y-2">
          <p className="font-semibold">Trip window: {fmtDate(data.trip.startDate)} (PM) to {fmtDate(data.trip.endDate)} (AM), {fmtYear(data.trip.startDate)}</p>
          <p className="text-sm text-slate-600">Arrival and departure are half-days.</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="bg-blue-50 border" onClick={() => setScreen('families')}>Setup Families</button>
            <button className="bg-blue-50 border" onClick={() => setScreen('rate')}>Rate Activities</button>
            <button className="bg-blue-50 border" onClick={() => setScreen('recommendations')}>Recommendations</button>
            <button className="bg-blue-50 border" onClick={() => setScreen('schedule')}>Schedule View</button>
            <button className="bg-blue-50 border" onClick={() => setScreen('export')}>Export</button>
            <button className="bg-blue-50 border" onClick={() => setScreen('settings')}>Settings</button>
          </div>
          <div className="flex gap-2">
            <button className="bg-slate-800 text-white" onClick={() => setShowShare(true)}>Share instructions</button>
            <button className="border" onClick={() => setData(resetData())}>Reset demo data</button>
          </div>
        </section>
      )}

      {screen === 'families' && (
        <section className="space-y-3">
          <button className="bg-blue-600 text-white" onClick={addFamily}>Add Family</button>
          {data.families.map((f) => (
            <div key={f.id} className="bg-white p-3 border rounded space-y-2">
              <input
                value={f.name}
                onChange={(e) => setData({ ...data, families: data.families.map((x) => (x.id === f.id ? { ...x, name: e.target.value } : x)) })}
                onBlur={(e) => {
                  if (!e.target.value.trim()) {
                    alert('Family name cannot be empty');
                    setData({ ...data, families: data.families.map((x) => (x.id === f.id ? { ...x, name: 'Unnamed Family' } : x)) });
                  }
                }}
              />
              <input placeholder="Home base town (optional)" value={f.homeBaseTown ?? ''} onChange={(e) => setData({ ...data, families: data.families.map((x) => (x.id === f.id ? { ...x, homeBaseTown: e.target.value } : x)) })} />
              <button className="border" onClick={() => addMember(f.id)}>Add Member</button>
              <ul className="text-sm list-disc ml-5">
                {data.members.filter((m) => m.familyId === f.id).map((m) => (
                  <li key={m.id}>{m.name}</li>
                ))}
              </ul>

              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr><th>Date</th><th>AM</th><th>PM</th></tr>
                  </thead>
                  <tbody>
                    {(data.familyAvailability[f.id] ?? []).map((d: FamilyAvailabilityDay) => {
                      const slotMeta = data.trip.daySlots.find((x) => x.dateISO === d.dateISO);
                      return (
                        <tr key={d.dateISO}>
                          <td>{fmtDate(d.dateISO)}</td>
                          <td>
                            {slotMeta?.amEnabled ? (
                              <label>
                                <input type="checkbox" className="w-auto mr-1" checked={d.amGroupTime ?? false} onChange={(e) => setFamilyAvailability(f.id, d.dateISO, 'amGroupTime', e.target.checked)} />
                                Group time available
                              </label>
                            ) : 'Disabled'}
                          </td>
                          <td>
                            {slotMeta?.pmEnabled ? (
                              <label>
                                <input type="checkbox" className="w-auto mr-1" checked={d.pmGroupTime ?? false} onChange={(e) => setFamilyAvailability(f.id, d.dateISO, 'pmGroupTime', e.target.checked)} />
                                Group time available
                              </label>
                            ) : 'Disabled'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      )}

      {screen === 'rate' && (
        <section className="space-y-3">
          <div className="bg-white border rounded p-3 grid gap-2">
            <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}>
              <option value="">Select member</option>
              {data.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>{categories.map((c) => <option key={c}>{c}</option>)}</select>
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value as typeof tagFilter)}>{['All', 'Anne', 'Food', 'Outdoor', 'Rainy-day'].map((t) => <option key={t}>{t}</option>)}</select>
            </div>
            <p className="text-sm">Completion: {completion}%</p>
          </div>

          {selectedMember && filteredActivities.map((a) => (
            <div key={a.id} className="bg-white border rounded p-2 flex justify-between items-center gap-2">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-slate-500">{a.category}</p>
              </div>
              <select className="w-20" value={data.ratings[ratingKey(selectedMember, a.id)] ?? ''} onChange={(e) => setData({ ...data, ratings: { ...data.ratings, [ratingKey(selectedMember, a.id)]: Number(e.target.value) } })}>
                <option value="">-</option>
                {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          ))}

          <div className="bg-white p-3 border rounded space-y-2">
            <h3 className="font-semibold">Edit activity inventory</h3>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Name" value={newActivity.name} onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })} />
              <input placeholder="Category" value={newActivity.category} onChange={(e) => setNewActivity({ ...newActivity, category: e.target.value })} />
              <input placeholder="Tags comma separated" value={newActivity.tags} onChange={(e) => setNewActivity({ ...newActivity, tags: e.target.value })} />
              <label className="flex items-center gap-2"><input className="w-auto" type="checkbox" checked={newActivity.togetherFriendly} onChange={(e) => setNewActivity({ ...newActivity, togetherFriendly: e.target.checked })} />Together-friendly</label>
            </div>
            <button
              className="bg-blue-600 text-white"
              onClick={() => {
                if (!newActivity.name.trim() || !newActivity.category.trim()) return alert('Activity name and category required');
                setData({
                  ...data,
                  activities: [...data.activities, {
                    id: crypto.randomUUID(),
                    name: newActivity.name.trim(),
                    category: newActivity.category.trim(),
                    tags: newActivity.tags.split(',').map((t) => t.trim()).filter(Boolean),
                    togetherFriendly: newActivity.togetherFriendly,
                  }],
                });
                setNewActivity({ name: '', category: '', tags: '', togetherFriendly: true });
              }}
            >
              Add activity
            </button>
            <div className="space-y-1 max-h-56 overflow-auto border rounded p-2">
              {data.activities.map((a) => (
                <div key={a.id} className="grid grid-cols-12 gap-1 items-center">
                  <input className="col-span-4" value={a.name} onChange={(e) => setData({ ...data, activities: data.activities.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)) })} />
                  <input className="col-span-3" value={a.category} onChange={(e) => setData({ ...data, activities: data.activities.map((x) => (x.id === a.id ? { ...x, category: e.target.value } : x)) })} />
                  <input className="col-span-3" value={a.tags.join(', ')} onChange={(e) => setData({ ...data, activities: data.activities.map((x) => (x.id === a.id ? { ...x, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) } : x)) })} />
                  <button className="col-span-2 border text-red-600" onClick={() => setData({ ...data, activities: data.activities.filter((x) => x.id !== a.id) })}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {screen === 'recommendations' && (
        <section className="space-y-4">
          <div className="bg-white border rounded p-3 grid grid-cols-2 gap-2">
            <label>Together group avg min <input type="number" step="0.1" value={data.trip.thresholds.togetherGroupAvgMin} onChange={(e) => setData({ ...data, trip: { ...data.trip, thresholds: { ...data.trip.thresholds, togetherGroupAvgMin: Number(e.target.value) } } })} /></label>
            <label>Together disagreement max <input type="number" step="0.1" value={data.trip.thresholds.togetherDisagreementMax} onChange={(e) => setData({ ...data, trip: { ...data.trip, thresholds: { ...data.trip.thresholds, togetherDisagreementMax: Number(e.target.value) } } })} /></label>
            <label>Separate family avg min <input type="number" step="0.1" value={data.trip.thresholds.separateFamilyAvgMin} onChange={(e) => setData({ ...data, trip: { ...data.trip, thresholds: { ...data.trip.thresholds, separateFamilyAvgMin: Number(e.target.value) } } })} /></label>
            <label>Separate group avg max <input type="number" step="0.1" value={data.trip.thresholds.separateGroupAvgMax} onChange={(e) => setData({ ...data, trip: { ...data.trip, thresholds: { ...data.trip.thresholds, separateGroupAvgMax: Number(e.target.value) } } })} /></label>
            <label>Separate disagreement min <input type="number" step="0.1" value={data.trip.thresholds.separateDisagreementMin} onChange={(e) => setData({ ...data, trip: { ...data.trip, thresholds: { ...data.trip.thresholds, separateDisagreementMin: Number(e.target.value) } } })} /></label>
          </div>

          <div className="bg-white border rounded p-3">
            <h3 className="font-semibold">Best for ALL-TOGETHER</h3>
            <ul className="text-sm list-disc ml-5">
              {recs.together.slice(0, 10).map((r) => <li key={r.activity.id}>{r.activity.name} (avg {r.groupAverage.toFixed(2)}, disagreement {r.disagreement.toFixed(2)})</li>)}
            </ul>
          </div>

          <div className="bg-white border rounded p-3">
            <h3 className="font-semibold">Better as SEPARATE FAMILY TIME</h3>
            <ul className="text-sm list-disc ml-5">
              {recs.separate.slice(0, 10).map((r) => <li key={r.activity.id}>{r.activity.name} (separate score {r.separateScore.toFixed(2)})</li>)}
            </ul>
          </div>

          <div className="bg-white border rounded p-3">
            <h3 className="font-semibold">Two-family subgroups</h3>
            {recs.pairSuggestions.map((p) => (
              <p key={p.familyA + p.familyB} className="text-sm mb-2"><b>{p.familyA} + {p.familyB}:</b> {p.topActivities.map((a) => a.activity).join(', ')}</p>
            ))}
          </div>
        </section>
      )}

      {screen === 'schedule' && (
        <section className="space-y-3">
          {data.trip.daySlots.map((d) => {
            const row = data.schedule[d.dateISO] ?? {};
            const setSlot = (slot: 'amActivityId' | 'pmActivityId', value: string) => {
              const clean = value || undefined;
              setData({ ...data, schedule: { ...data.schedule, [d.dateISO]: { ...row, [slot]: clean } } });
            };
            const amWarn = row.amActivityId && Object.values(data.familyAvailability).some((fam) => fam.find((x) => x.dateISO === d.dateISO)?.amGroupTime === false);
            const pmWarn = row.pmActivityId && Object.values(data.familyAvailability).some((fam) => fam.find((x) => x.dateISO === d.dateISO)?.pmGroupTime === false);
            return (
              <div key={d.dateISO} className="bg-white p-3 rounded border">
                <h4 className="font-semibold">{fmtDate(d.dateISO)}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p>AM</p>
                    {d.amEnabled ? (
                      <select value={row.amActivityId ?? ''} onChange={(e) => setSlot('amActivityId', e.target.value)}>
                        <option value="">None</option>
                        {data.activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    ) : <p className="text-slate-500">Disabled (arrival/departure rule)</p>}
                    {amWarn && <p className="text-amber-600">Some families marked AM as family-only.</p>}
                  </div>
                  <div>
                    <p>PM</p>
                    {d.pmEnabled ? (
                      <select value={row.pmActivityId ?? ''} onChange={(e) => setSlot('pmActivityId', e.target.value)}>
                        <option value="">None</option>
                        {data.activities.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    ) : <p className="text-slate-500">Disabled (arrival/departure rule)</p>}
                    {pmWarn && <p className="text-amber-600">Some families marked PM as family-only.</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {screen === 'export' && (
        <section className="bg-white border rounded p-3 space-y-2">
          <button className="border" onClick={copyExportText}>Copy recommendations + schedule text</button>
          <button className="border" onClick={exportJson}>Download JSON</button>
          <button className="border" onClick={exportCsv}>Download CSV</button>
          <label className="block text-sm">Import JSON <input type="file" accept="application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); }} /></label>
        </section>
      )}

      {screen === 'settings' && (
        <section className="bg-white border rounded p-3 space-y-2">
          <label>Trip start date <input type="date" value={data.trip.startDate} onChange={(e) => setData({ ...data, trip: { ...data.trip, startDate: e.target.value } })} /></label>
          <label>Trip end/departure date <input type="date" value={data.trip.endDate} onChange={(e) => setData({ ...data, trip: { ...data.trip, endDate: e.target.value } })} /></label>
          <button className="bg-blue-600 text-white" onClick={() => updateDates(data.trip.startDate, data.trip.endDate)}>Regenerate schedule grid</button>
          <p className="text-xs text-slate-500">Warning: this resets family availability and removes invalid schedule slots.</p>
        </section>
      )}

      {showShare && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded p-4 max-w-sm">
            <h3 className="font-semibold">Share instructions</h3>
            <p className="text-sm mt-2">Everyone rates, then we review recommendations.</p>
            <button className="mt-4 bg-blue-600 text-white" onClick={() => setShowShare(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
