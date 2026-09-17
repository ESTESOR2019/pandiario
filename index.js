const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const serverless = require('serverless-http');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
let versiculosLista = [];

// ==========================================
// Configuración de CORS Oficial para Serverless
// ==========================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Responder solicitudes Preflight inmediatamente
app.options('*', cors());

// ==========================================
// Configuración Swagger UI
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Pan Diario Bíblico',
      version: '1.0.0',
      description: 'API para obtener un versículo de la Biblia por fecha utilizando un algoritmo determinista.'
    },
    servers: [
      {
        url: 'https://api-pandiario.vercel.app',
        description: 'Servidor de Producción'
      }
    ]
  },
  apis: ['./index.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
const swaggerUiOptions = {
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui.min.css',
  customJs: [
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-bundle.js',
    'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.18.3/swagger-ui-standalone-preset.js'
  ]
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// ==========================================
// Lógica de Carga de Datos
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

function garantizarDatos() {
  if (versiculosLista.length === 0) {
    try {
      const jsonPath = path.join(process.cwd(), 'RVR1960.json');
      const rawData = fs.readFileSync(jsonPath, 'utf8');
      const bibliaData = JSON.parse(rawData);
      versiculosLista = procesarBiblia(bibliaData);
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
// Endpoints
// ==========================================
app.get('/api/pan-diario', (req, res) => {
  garantizarDatos();

  if (versiculosLista.length === 0) {
    return res.status(503).json({ error: 'Los datos de la Biblia no se pudieron cargar.' });
  }

  const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
  const indice = obtenerIndicePorFecha(fecha, versiculosLista.length);
  const versiculoSeleccionado = versiculosLista[indice];

  return res.json({
    fecha: fecha,
    panDiario: versiculoSeleccionado
  });
});

app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

module.exports = app;
module.exports.handler = serverless(app);