import React, { useMemo, useState, useEffect } from 'react';
import { SafeAreaView, View, Text, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import { useOutbox } from '../hooks/useOutbox';
import { listar } from '.../src/api';        // tu fetch a Supabase para listar
import { toCSV } from '.../src/lib/csv';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function Index() {
  const [fecha, setFecha] = useState(dayjs().format('YYYY-MM-DD'));
  const [nombre, setNombre] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [adultos, setAdultos] = useState('0');
  const [menores, setMenores] = useState('0');
  const [jubiPens, setJubiPens] = useState('0');
  const total = useMemo(() =>
    (parseInt(adultos||'0')||0)+(parseInt(menores||'0')||0)+(parseInt(jubiPens||'0')||0),
  [adultos, menores, jubiPens]);

  const { isOnline, pendingCount, syncing, enqueueInsert, flushNow } = useOutbox();
  const [rows, setRows] = useState<any[]>([]);

  async function refresh() {
    try {
      const data = await listar(); // tu select a supabase
      setRows(data as any[]);
    } catch (e:any) {
      // si no hay internet, sólo mostramos lo que ya tenías cargado antes
      console.log('Listar error:', e.message);
    }
  }

  useEffect(() => { refresh(); }, [isOnline, syncing]); // recarga al volver online/sync

  async function onGuardar() {
    if (!nombre.trim() || !localidad.trim()) return;
    const payload = {
      fecha, nombre: nombre.trim(), localidad: localidad.trim(),
      adultos: parseInt(adultos||'0')||0,
      menores: parseInt(menores||'0')||0,
      jubi_pens: parseInt(jubiPens||'0')||0,
      total
    };
    try {
      await enqueueInsert(payload);  // offline o online
      setNombre(''); setLocalidad(''); setAdultos('0'); setMenores('0'); setJubiPens('0');
      if (isOnline) refresh();       // si hay net, se verá enseguida
      Alert.alert('OK', isOnline ? 'Guardado' : 'Guardado offline (pendiente de envío)');
    } catch (e:any) {
      Alert.alert('Error', e.message);
    }
  }

  async function exportar() {
    const csv = toCSV(rows);
    const path = FileSystem.cacheDirectory + 'visitantes.csv';
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'text/csv' });
  }

  return (
    <SafeAreaView style={{ flex:1, padding:12, backgroundColor:'#f5f5f5' }}>
      {/* Banner de estado */}
      <View style={{ marginBottom:8, padding:8, borderRadius:8, backgroundColor: isOnline ? '#e8f5e9' : '#fff3cd' }}>
        <Text>{isOnline ? 'Online' : 'Offline'} — Pendientes: {pendingCount} {syncing ? '(sincronizando...)' : ''}</Text>
        {!isOnline ? <Text style={{ fontSize:12, color:'#7a6' }}>Las cargas quedarán en cola y se enviarán al reconectar.</Text> : null}
        <View style={{ marginTop:6 }}>
          <Button title="Reintentar ahora" onPress={flushNow} />
        </View>
      </View>

      {/* Form */}
      <View style={{ backgroundColor:'#fff', padding:10, borderRadius:12, gap:8 }}>
        <Text>Fecha (YYYY-MM-DD)</Text>
        <TextInput value={fecha} onChangeText={setFecha} style={s.input} />
        <Text>Nombre y Apellido</Text>
        <TextInput value={nombre} onChangeText={setNombre} style={s.input} />
        <Text>Localidad</Text>
        <TextInput value={localidad} onChangeText={setLocalidad} style={s.input} />
        <View style={{ flexDirection:'row', gap:8 }}>
          <View style={{ flex:1 }}>
            <Text>Adultos</Text>
            <TextInput value={adultos} onChangeText={setAdultos} keyboardType="numeric" style={s.input} />
          </View>
          <View style={{ flex:1 }}>
            <Text>Menores</Text>
            <TextInput value={menores} onChangeText={setMenores} keyboardType="numeric" style={s.input} />
          </View>
          <View style={{ flex:1 }}>
            <Text>Jubi/Pens</Text>
            <TextInput value={jubiPens} onChangeText={setJubiPens} keyboardType="numeric" style={s.input} />
          </View>
        </View>
        <Text style={{ fontWeight:'700' }}>Total: {total}</Text>
        <Button title="Guardar" onPress={onGuardar} />
      </View>

      {/* Botón exportar (opcional) */}
      <View style={{ marginTop:10 }}>
        <Button title="Exportar CSV" onPress={exportar} />
      </View>
    </SafeAreaView>
  );
}

const s = {
  input: { borderWidth:1, borderColor:'#ddd', borderRadius:8, paddingHorizontal:10, paddingVertical:8, backgroundColor:'#fff' } as any
};
