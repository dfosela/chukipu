'use client';

import { useState } from 'react';
import { ref, get, update } from 'firebase/database';
import { db } from '@/lib/firebase';

interface PlanSnapshot {
    id: string;
    category: string;
    genre?: string;
    title?: string;
}

export default function MigratePage() {
    const [log, setLog] = useState<string[]>([]);
    const [running, setRunning] = useState(false);
    const [done, setDone] = useState(false);

    const addLog = (msg: string) => setLog(prev => [...prev, msg]);

    const runMigration = async () => {
        setRunning(true);
        setLog([]);
        setDone(false);

        try {
            addLog('Leyendo todos los planes...');
            const snap = await get(ref(db, 'plans'));
            if (!snap.exists()) {
                addLog('No se encontraron planes.');
                setDone(true);
                setRunning(false);
                return;
            }

            const data = snap.val() as Record<string, Omit<PlanSnapshot, 'id'>>;
            const plans: PlanSnapshot[] = Object.keys(data).map(id => ({ id, ...data[id] }));

            const toMigrate = plans.filter(p => p.category === 'Comida' || p.category === 'Cena');
            addLog(`Planes a migrar: ${toMigrate.length}`);

            if (toMigrate.length === 0) {
                addLog('Nada que migrar.');
                setDone(true);
                setRunning(false);
                return;
            }

            const updates: Record<string, string> = {};
            for (const plan of toMigrate) {
                updates[`plans/${plan.id}/category`] = 'Salida';
                updates[`plans/${plan.id}/genre`] = plan.category; // 'Comida' o 'Cena'
                addLog(`  · "${plan.title || plan.id}" (${plan.category}) → Salida / ${plan.category}`);
            }

            addLog('Aplicando cambios...');
            await update(ref(db), updates);
            addLog(`✓ Migración completada. ${toMigrate.length} planes actualizados.`);
        } catch (err) {
            addLog(`Error: ${err}`);
        }

        setDone(true);
        setRunning(false);
    };

    return (
        <div style={{ padding: 32, maxWidth: 600, fontFamily: 'monospace' }}>
            <h1 style={{ fontSize: 20, marginBottom: 8 }}>Migración de categorías</h1>
            <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
                Mueve los planes de categoría <b>Comida</b> y <b>Cena</b> a <b>Salida</b> con el tipo correspondiente.
                Ejecuta esto solo una vez.
            </p>

            <button
                onClick={runMigration}
                disabled={running || done}
                style={{
                    padding: '10px 20px',
                    background: done ? '#52c788' : '#e8749a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: running || done ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: 15,
                    marginBottom: 20,
                }}
            >
                {running ? 'Migrando...' : done ? '✓ Completado' : 'Ejecutar migración'}
            </button>

            {log.length > 0 && (
                <div style={{ background: '#111', color: '#eee', padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.7 }}>
                    {log.map((line, i) => <div key={i}>{line}</div>)}
                </div>
            )}
        </div>
    );
}
