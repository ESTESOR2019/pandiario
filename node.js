const express = require('express');
const fs = require('fs');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
const PORT = process.env.PORT || 3000;

let versiculosLista = [];

// ==========================================
// Configuración de Swagger / OpenAPI
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Pan Diario Bíblico',
      version: '1.0.0',
      description: 'API para obtener un versículo de la Biblia por fecha utilizando un algoritmo determinista (Hash).'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local'
      },
      {
        url: 'https://api-pandiario.vercel.app',
        description: 'Servidor de Producción (Vercel)'
      }
    ]
  },
  apis: [__filename] // Genera la documentación leyendo los comentarios JSDoc de este mismo archivo
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ==========================================
// Funciones de Procesamiento de la Biblia
// ==========================================

function procesarBiblia(data) {
  const lista = [];
  if (!data || !data.books) return lista;

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

// Carga sincrónica/directa compatible con Serverless (Vercel) y lectura de archivo local
function garantizarDatos() {
  if (versiculosLista.length === 0) {
    try {
      const jsonPath = path.join(__dirname, 'RVR1960.json');
      const rawData = fs.readFileSync(jsonPath, 'utf8');
      const bibliaData = JSON.parse(rawData);
      versiculosLista = procesarBiblia(bibliaData);
      console.log(`Biblia cargada correctamente. Total versículos: ${versiculosLista.length}`);
    } catch (error) {
      console.error('Error al cargar RVR1960.json local:', error);
    }
  }
}

function obtenerIndicePorFecha(fechaStr, totalItems) {
  let hash = 0;
  for (let i = 0; i < fechaStr.length; i++) {
    hash = (hash << 5) - hash + fechaStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % totalItems;
}

// ==========================================
// Documentación JSDoc Endpoint Pan Diario
// ==========================================

/**
 * @openapi
 * /api/pan-diario:
 *   get:
 *     summary: Obtiene el versículo del día (Pan Diario)
 *     description: Retorna un versículo bíblico único asociativo según la fecha enviada o la fecha actual UTC.
 *     parameters:
 *       - in: query
 *         name: fecha
 *         schema:
 *           type: string
 *           example: "2026-09-17"
 *         required: false
 *         description: Fecha en formato YYYY-MM-DD para calcular el versículo asignado a ese día.
 *     responses:
 *       200:
 *         description: Éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 fecha:
 *                   type: string
 *                   example: "2026-09-17"
 *                 panDiario:
 *                   type: object
 *                   properties:
 *                     libro:
 *                       type: string
 *                       example: "Génesis"
 *                     capitulo:
 *                       type: string
 *                       example: "Génesis 1"
 *                     versiculo:
 *                       type: string
 *                       example: "1"
 *                     texto:
 *                       type: string
 *                       example: "En el principio creó Dios los cielos y la tierra."
 *       503:
 *         description: Servicio no disponible por fallo al cargar el JSON
 */
app.get('/api/pan-diario', (req, res) => {
  garantizarDatos();

  if (versiculosLista.length === 0) {
    return res.status(503).json({ error: 'Los datos de la Biblia no se pudieron cargar.' });
  }

  const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
  const indice = obtenerIndicePorFecha(fecha, versiculosLista.length);
  const versiculoSeleccionado = versiculosLista[indice];

  res.json({
    fecha: fecha,
    panDiario: versiculoSeleccionado
  });
});

// Endpoint base que redirige automáticamente a la documentación
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Escuchar puerto en local
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    garantizarDatos();
    console.log(`API y SwaggerUI ejecutándose en http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
