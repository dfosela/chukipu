'use client';

import { useState } from 'react';
import { ref, get, update } from 'firebase/database';
import { db } from '@/lib/firebase';

export default function MigrateCarteleraPage() {
    const [log, setLog] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);

    const addLog = (msg: string) => setLog(prev => [...prev, msg]);

    const run = async () => {
        setRunning(true);
        setLog([]);
        try {
            const snap = await get(ref(db, 'plans'));
            if (!snap.exists()) { addLog('No plans found.'); setDone(true); return; }

            const plans = snap.val() as Record<string, { category?: string }>;
            const updates: Record<string, string> = {};

            for (const [id, plan] of Object.entries(plans)) {
                if (plan.category === 'Película') {
                    updates[`plans/${id}/category`] = 'Cartelera';
                    addLog(`✓ ${id} → Cartelera`);
                }
            }

            if (Object.keys(updates).length === 0) {
                addLog('Nothing to migrate.');
            } else {
                await update(ref(db), updates);
                addLog(`\nDone. Migrated ${Object.keys(updates).length} plans.`);
            }
        } catch (err) {
            addLog(`Error: ${err}`);
        } finally {
            setRunning(false);
            setDone(true);
        }
    };

    return (
        <div style={{ padding: 24, fontFamily: 'monospace' }}>
            <h1>Migrate Película → Cartelera</h1>
            <button onClick={run} disabled={running || done}
                style={{ marginTop: 16, padding: '8px 20px', fontSize: 15 }}>
                {running ? 'Running...' : done ? 'Done' : 'Run migration'}
            </button>
            <pre style={{ marginTop: 16, whiteSpace: 'pre-wrap' }}>{log.join('\n')}</pre>
        </div>
    );
}
