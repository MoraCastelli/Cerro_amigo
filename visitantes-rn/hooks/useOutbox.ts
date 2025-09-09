import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { supabase } from '../src/lib/supabase';

const STORAGE_KEY = 'outbox:v1';

type InsertJob = {
  id: string;                 // id único del job
  kind: 'insert';
  table: 'visitantes';        // podés ampliar a otras tablas si querés
  payload: {
    fecha: string;
    nombre: string;
    localidad: string;
    adultos: number;
    menores: number;
    jubi_pens: number;
    total: number;
  };
  attempts: number;           // cuántos intentos
  lastError?: string;         // último error (debug)
  createdAt: number;
};

type Job = InsertJob;

async function loadQueue(): Promise<Job[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw) as Job[]; } catch { return []; }
}

async function saveQueue(q: Job[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(q));
}

function mkId() {
  return `job_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function useOutbox() {
  const [online, setOnline] = useState<boolean>(true);
  const [queue, setQueue] = useState<Job[]>([]);
  const [syncing, setSyncing] = useState(false);

  // cargar cola al montar
  useEffect(() => {
    (async () => {
      setQueue(await loadQueue());
    })();
  }, []);

  // detectar conectividad
  useEffect(() => {
    const sub = NetInfo.addEventListener((s: NetInfoState) => {
      const ok = !!(s.isConnected && (s.isInternetReachable ?? true));
      setOnline(ok);
    });
    return () => sub();
  }, []);

  const pendingCount = queue.length;

  // guardar la cola cada vez que cambia
  useEffect(() => { saveQueue(queue); }, [queue]);

  // procesar cola (con backoff simple)
  const processingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    if (!online) return;
    if (queue.length === 0) return;

    processingRef.current = true;
    setSyncing(true);
    try {
      let newQueue = [...queue];

      for (let i = 0; i < newQueue.length; i++) {
        const job = newQueue[i];

        // reintento con backoff: 1s, 2s, 4s, 8s (máx 10s)
        const wait = Math.min(1000 * Math.pow(2, job.attempts || 0), 10000);
        if (job.attempts && job.attempts > 0) {
          await new Promise(r => setTimeout(r, wait));
        }

        try {
          if (job.kind === 'insert') {
            const { error } = await supabase.from(job.table).insert(job.payload);
            if (error) throw error;
          }
          // si salió bien, lo saco de la cola
          newQueue.splice(i, 1);
          i--; // ajustar índice tras eliminar
          setQueue([...newQueue]);
        } catch (e: any) {
          // Si es error 4xx (validación, auth), no sirve reintentar infinito
          const msg = e?.message || String(e);
          const attempts = (job.attempts ?? 0) + 1;

          // si es 4xx “fatal”, descartar (o dejalo con attempts alto)
          const fatal = /(?:401|403|404|422)/.test(msg);
          if (fatal || attempts >= 8) {
            newQueue[i] = { ...job, attempts, lastError: msg };
            // lo dejamos en cola con error; el usuario puede intentar flush manual
          } else {
            newQueue[i] = { ...job, attempts, lastError: msg };
          }
          setQueue([...newQueue]);
          // cortar el bucle por ahora; reintentaremos luego (al reconectar o flush manual)
          break;
        }
      }
    } finally {
      setSyncing(false);
      processingRef.current = false;
    }
  }, [online, queue]);

  // procesar al volver el online o cuando cambia la cola
  useEffect(() => {
    if (online && queue.length > 0) {
      processQueue();
    }
  }, [online, queue, processQueue]);

  // API: encolar una inserción (si hay net, intenta enviar ya)
  const enqueueInsert = useCallback(async (payload: InsertJob['payload']) => {
    const job: InsertJob = {
      id: mkId(),
      kind: 'insert',
      table: 'visitantes',
      payload,
      attempts: 0,
      createdAt: Date.now(),
    };
    setQueue(q => [...q, job]);
    // si estamos online, intentá procesar de inmediato
    if (online) processQueue();
  }, [online, processQueue]);

  // API: forzar flush ahora
  const flushNow = useCallback(async () => {
    await processQueue();
  }, [processQueue]);

  return {
    isOnline: online,
    pendingCount,
    syncing,
    enqueueInsert,
    flushNow,
    queue, // (opcional, por si querés listar pendings)
  };
}
