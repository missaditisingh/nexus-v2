import React, { useEffect, useMemo, useState } from 'react';
import { BeatId, BEAT_DEFINITIONS, DayDigest, DigestItem as DigestItemType } from '../../lib/nexus/types';
import { DigestColumn } from './DigestColumn';
import { DigestItem } from './DigestItem';

interface DigestGridProps {
  digest: DayDigest;
  selectedBeats: BeatId[];
  isSavedViewActive: boolean;
  savedItems: DigestItemType[];
}

export const DigestGrid: React.FC<DigestGridProps> = ({
  digest,
  selectedBeats,
  isSavedViewActive,
  savedItems,
}) => {
  // Active beat filter inside the saved view. null means "show every saved dispatch".
  const [savedBeatFilter, setSavedBeatFilter] = useState<BeatId | null>(null);

  // Collect all columns that should be rendered based on selected beats
  const activeColumns = useMemo(() => {
    const cols: { beatId: BeatId; beatLabel: string; columnKey: string; items: DigestItemType[] }[] = [];

    for (const beatId of selectedBeats) {
      const beatDef = BEAT_DEFINITIONS[beatId];
      const beatData = digest.beats?.[beatId];
      const beatCols = beatDef?.columns || [];

      for (const colKey of beatCols) {
        const items = beatData?.columns?.[colKey] || [];
        cols.push({
          beatId,
          beatLabel: beatDef?.label || beatId,
          columnKey: colKey,
          items,
        });
      }
    }
    return cols;
  }, [digest, selectedBeats]);

  // Which beats get a filter chip: the reader's own beats, plus any beat they have
  // a saved dispatch from (so items saved before a beat change stay reachable).
  const savedFilterBeats = useMemo(() => {
    const present = new Set<BeatId>(selectedBeats);
    for (const item of savedItems) {
      if (item.beat) present.add(item.beat);
    }
    return (Object.keys(BEAT_DEFINITIONS) as BeatId[]).filter((beatId) => present.has(beatId));
  }, [selectedBeats, savedItems]);

  // Saved count per beat, used for the chip labels.
  const savedCountByBeat = useMemo(() => {
    const counts: Partial<Record<BeatId, number>> = {};
    for (const item of savedItems) {
      if (item.beat) {
        counts[item.beat] = (counts[item.beat] || 0) + 1;
      }
    }
    return counts;
  }, [savedItems]);

  const visibleSavedItems = useMemo(() => {
    if (!savedBeatFilter) return savedItems;
    return savedItems.filter((item) => item.beat === savedBeatFilter);
  }, [savedItems, savedBeatFilter]);

  // Leaving the saved view clears the filter, so reopening SAVED always starts on "all".
  useEffect(() => {
    if (!isSavedViewActive) {
      setSavedBeatFilter(null);
    }
  }, [isSavedViewActive]);

  // If the filtered beat loses its chip (last save removed and the reader does not
  // follow that beat), drop the filter rather than stranding the view on a dead beat.
  useEffect(() => {
    if (savedBeatFilter && !savedFilterBeats.includes(savedBeatFilter)) {
      setSavedBeatFilter(null);
    }
  }, [savedBeatFilter, savedFilterBeats]);

  // Handle mobile anchor smooth scroll
  const handleScrollToColumn = (colKey: string) => {
    const el = document.getElementById(`column-${colKey}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (isSavedViewActive) {
    const activeBeatLabel = savedBeatFilter ? BEAT_DEFINITIONS[savedBeatFilter]?.label : null;

    return (
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div>
            <span className="nexus-meta text-zinc-500">CLIENT-SIDE STORAGE</span>
            <h2 className="nexus-headline text-xl text-zinc-100 mt-0.5">
              Bookmarked Dispatches (
              {savedBeatFilter
                ? `${visibleSavedItems.length} of ${savedItems.length}`
                : savedItems.length}
              )
            </h2>
          </div>
          <span className="nexus-meta text-zinc-400">
            SAVED LOCALLY IN LOCALSTORAGE
          </span>
        </div>

        {/* Beat filter row. Only shown once there is something saved to narrow. */}
        {savedItems.length > 0 && savedFilterBeats.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar select-none">
            <span className="nexus-meta text-zinc-500 shrink-0 mr-1 hidden sm:inline">
              BEAT:
            </span>

            <button
              onClick={() => setSavedBeatFilter(null)}
              aria-pressed={savedBeatFilter === null}
              className={`nexus-meta px-3 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer ${
                savedBeatFilter === null
                  ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-medium'
                  : 'bg-white/[0.025] border-white/[0.07] text-zinc-400 hover:text-zinc-100 hover:border-white/[0.2]'
              }`}
            >
              ALL ({savedItems.length})
            </button>

            {savedFilterBeats.map((beatId) => {
              const isActive = savedBeatFilter === beatId;
              const count = savedCountByBeat[beatId] || 0;
              return (
                <button
                  key={beatId}
                  onClick={() => setSavedBeatFilter(isActive ? null : beatId)}
                  aria-pressed={isActive}
                  className={`nexus-meta px-3 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-medium'
                      : 'bg-white/[0.025] border-white/[0.07] text-zinc-400 hover:text-zinc-100 hover:border-white/[0.2]'
                  }`}
                >
                  {BEAT_DEFINITIONS[beatId].label.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>
        )}

        {savedItems.length === 0 ? (
          <div className="nexus-card py-16 px-6 text-center max-w-lg mx-auto">
            <span className="nexus-meta text-zinc-400 tracking-[0.25em] block mb-2">
              NO BOOKMARKS RECORDED
            </span>
            <p className="nexus-body text-zinc-400">
              Dispatches you bookmark via the ribbon icon are persisted exclusively on this device.
            </p>
          </div>
        ) : visibleSavedItems.length === 0 ? (
          <div className="nexus-card py-16 px-6 text-center max-w-lg mx-auto">
            <span className="nexus-meta text-zinc-400 tracking-[0.25em] block mb-2">
              NO BOOKMARKS IN THIS BEAT
            </span>
            <p className="nexus-body text-zinc-400">
              You have {savedItems.length} saved dispatch{savedItems.length === 1 ? '' : 'es'}, but
              none from {activeBeatLabel}.
            </p>
            <button
              onClick={() => setSavedBeatFilter(null)}
              className="nexus-meta mt-5 px-3 py-1.5 rounded-full border bg-white/[0.025] border-white/[0.07] text-zinc-300 hover:text-zinc-100 hover:border-white/[0.2] transition-all cursor-pointer"
            >
              SHOW ALL SAVED
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleSavedItems.map((item) => (
              <DigestItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Mobile horizontally scrollable column jump pill row */}
      {activeColumns.length > 1 && (
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto pb-2 pt-1 no-scrollbar border-b border-white/[0.04]">
          <span className="nexus-meta text-zinc-600 text-[11px] shrink-0 mr-1">
            JUMP:
          </span>
          {activeColumns.map((col) => (
            <button
              key={`${col.beatId}-${col.columnKey}`}
              onClick={() => handleScrollToColumn(col.columnKey)}
              className="nexus-meta text-[11px] px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-zinc-200 hover:border-white/[0.15] shrink-0 cursor-pointer"
            >
              {col.columnKey.toUpperCase()} ({col.items.length})
            </button>
          ))}
        </div>
      )}

      {/* Primary Grid: 3 columns wide on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {activeColumns.map((col) => (
          <DigestColumn
            key={`${col.beatId}-${col.columnKey}`}
            columnKey={col.columnKey}
            beatLabel={col.beatLabel}
            items={col.items}
          />
        ))}
      </div>
    </section>
  );
};
