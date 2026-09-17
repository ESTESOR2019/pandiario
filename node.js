const express = require('express');
const app = express();
const PORT = 3000;

const JSON_URL = 'https://mrk214.github.io/snapshots/es___spa___spa/NTV_vid_127.json';

// Variable para almacenar en memoria el JSON y no descargarlo en cada request
let bibliaData = null;

// Función para cargar los datos al iniciar el servidor
async function cargarDatos() {
  try {
    const respuesta = await fetch(JSON_URL);
    bibliaData = await respuesta.json();
    console.log('JSON cargado correctamente desde la URL.');
  } catch (error) {
    console.error('Error al descargar el JSON:', error);
  }
}

// Endpoint para el Pan Diario (Aleatorio)
app.get('/api/pan-diario/aleatorio', (req, res) => {
  if (!bibliaData) {
    return res.status(503).json({ error: 'Los datos aún no están listos' });
  }

  // Ajusta la selección según la estructura interna que tenga ese JSON específico
  // Si es un array:
  const indiceAleatorio = Math.floor(Math.random() * bibliaData.length);
  const versiculo = bibliaData[indiceAleatorio];

  res.json({
    panDiario: versiculo
  });
});

app.listen(PORT, async () => {
  await cargarDatos();
  console.log(`API corriendo en http://localhost:${PORT}`);
});
