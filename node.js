const express = require('express');
const app = express();
const PORT = 3000;

const JSON_URL = 'RVR1960.json';

let versiculosLista = [];

// Extrae todos los versículos en un array plano de objetos fácil de consumir
function procesarBiblia(data) {
  const lista = [];
  
  if (!data.books) return lista;

  data.books.forEach(libro => {
    libro.chapters.forEach(capitulo => {
      capitulo.items.forEach(item => {
        if (item.type === 'verse' && item.lines && item.lines.length > 0) {
          lista.push({
            libro: libro.name,
            capitulo: capitulo.current.human,
            versiculo: item.verse_numbers.join('-'),
            texto: item.lines.join(' ')
          });
        }
      });
    });
  });

  return lista;
}

// Carga y procesa los datos al arrancar el servidor
async function cargarDatos() {
  try {
    const respuesta = await fetch(JSON_URL);
    const bibliaData = await respuesta.json();
    versiculosLista = procesarBiblia(bibliaData);
    console.log(`Biblia procesada correctamente. Total de versículos: ${versiculosLista.length}`);
  } catch (error) {
    console.error('Error al descargar o procesar el JSON:', error);
  }
}

// Función hash simple para convertir la cadena de fecha a un número entero
function obtenerIndicePorFecha(fechaStr, totalItems) {
  let hash = 0;
  for (let i = 0; i < fechaStr.length; i++) {
    hash = (hash << 5) - hash + fechaStr.charCodeAt(i);
    hash |= 0; // Convertir a entero de 32 bits
  }
  return Math.abs(hash) % totalItems;
}

// Endpoint para el Pan Diario por fecha
// Permite consulta opcional: /api/pan-diario?fecha=2026-09-17
app.get('/api/pan-diario', (req, res) => {
  if (versiculosLista.length === 0) {
    return res.status(503).json({ error: 'Los datos aún no están listos' });
  }

  // Si no se envía la fecha como query param, se usa la fecha actual UTC (YYYY-MM-DD)
  const fecha = req.query.fecha || new Date().toISOString().split('T')[0];

  const indice = obtenerIndicePorFecha(fecha, versiculosLista.length);
  const versiculoSeleccionado = versiculosLista[indice];

  res.json({
    fecha: fecha,
    panDiario: versiculoSeleccionado
  });
});

app.listen(PORT, async () => {
  await cargarDatos();
  console.log(`API corriendo en http://localhost:${PORT}`);
});
