import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, Button, FlatList, Alert, TouchableOpacity } from 'react-native';
import dayjs from 'dayjs';
import { listar, crear, eliminar } from '../src/api';
import type { Visitante } from '../src/lib/types';

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { toCSV } from '../src/lib/csv';

async function exportar(rows:any[]) {
  const csv = toCSV(rows);
  const path = FileSystem.cacheDirectory + 'visitantes.csv';
  await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(path, { mimeType: 'text/csv' });
}


export default function App() {
  const [fecha, setFecha] = useState(dayjs().format('YYYY-MM-DD'));
  const [nombre, setNombre] = useState('');
  const [localidad, setLocalidad] = useState('');
  const [adultos, setAdultos] = useState('0');
  const [menores, setMenores] = useState('0');
  const [jubiPens, setJubiPens] = useState('0');
  const total = useMemo(() => (
    (parseInt(adultos||'0')||0)+(parseInt(menores||'0')||0)+(parseInt(jubiPens||'0')||0)
  ), [adultos, menores, jubiPens]);

  const [rows, setRows] = useState<Visitante[]>([]);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  async function refresh() {
    try {
      const data = await listar(desde || undefined, hasta || undefined);
      setRows(data as any);
    } catch (e:any) {
      Alert.alert('Error listando', e.message);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function onGuardar() {
    if (!nombre.trim() || !localidad.trim()) return;
    const v: Visitante = {
      fecha, nombre: nombre.trim(), localidad: localidad.trim(),
      adultos: parseInt(adultos||'0')||0,
      menores: parseInt(menores||'0')||0,
      jubi_pens: parseInt(jubiPens||'0')||0,
      total
    };
    try {
      await crear(v);
      setNombre(''); setLocalidad(''); setAdultos('0'); setMenores('0'); setJubiPens('0');
      refresh();
    } catch (e:any) {
      Alert.alert('Error guardando', e.message);
    }
  }

  return (
    <SafeAreaView style={{ flex:1, padding:12, backgroundColor:'#f5f5f5' }}>
      <Text style={{ fontSize:18, fontWeight:'700', marginBottom:8 }}>PLANILLA DE VISITANTES</Text>

      <View style={{ backgroundColor:'#fff', padding:10, borderRadius:12, gap:8 }}>
        <Text>Fecha (YYYY-MM-DD)</Text>
        <TextInput value={fecha} onChangeText={setFecha} style={s.input} placeholder="2025-09-09" />
        <Text>Nombre y Apellido</Text>
        <TextInput value={nombre} onChangeText={setNombre} style={s.input} placeholder="Nombre y Apellido" />
        <Text>Localidad</Text>
        <TextInput value={localidad} onChangeText={setLocalidad} style={s.input} placeholder="Localidad" />
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

      <View style={{ marginTop:12, backgroundColor:'#fff', padding:10, borderRadius:12, gap:8 }}>
        <Text style={{ fontWeight:'600' }}>Filtros</Text>
        <View style={{ flexDirection:'row', gap:8 }}>
          <TextInput value={desde} onChangeText={setDesde} style={[s.input,{ flex:1 }]} placeholder="Desde YYYY-MM-DD" />
          <TextInput value={hasta} onChangeText={setHasta} style={[s.input,{ flex:1 }]} placeholder="Hasta YYYY-MM-DD" />
          <Button title="Filtrar" onPress={refresh} />
        </View>
      </View>

      <FlatList
        style={{ marginTop:12 }}
        data={rows}
        keyExtractor={(item:any)=>item.id!}
        renderItem={({item}:any)=>(
          <View style={{ backgroundColor:'#fff', padding:10, borderRadius:12, marginBottom:8 }}>
            <Text>{item.fecha} — {item.nombre}</Text>
            <Text>{item.localidad}</Text>
            <Text>Ad {item.adultos}  /  Me {item.menores}  /  Ju {item.jubi_pens}  /  Total {item.total}</Text>
            <View style={{ alignItems:'flex-end' }}>
              <TouchableOpacity onPress={async()=>{ await eliminar(item.id!); refresh(); }}>
                <Text style={{ color:'red', marginTop:6 }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const s = {
  input: {
    borderWidth:1, borderColor:'#ddd', borderRadius:8, paddingHorizontal:10, paddingVertical:8, backgroundColor:'#fff'
  } as any
};
