export function toCSV(rows: any[]) {
  const header = ['Fecha','Nombre y Apellido','Localidad','Adultos','Menores','Jubi/Pens','Total'];
  const lines = rows.map(r => [
    r.fecha, r.nombre, r.localidad, r.adultos, r.menores, r.jubi_pens, r.total
  ]);
  return [header, ...lines].map(a => a.join(',')).join('\n');
}
