# Índice de ocupación · Almacén de repuestos

Tablero web (Next.js) que reemplaza las apps de Streamlit/Dash de esta carpeta.
Se carga el Excel con las hojas **DATA** y **EXISTENCIAS** y se arma el tablero.
El archivo se procesa **en el navegador**: no se sube a ningún servidor. Queda guardado
en el equipo (IndexedDB) para que al volver a abrir se vea el último archivo.

## Se alimenta con el Excel del índice
Sube `Indice_Ocupacion_Repuestos_AUTOMATICO.xlsx` (hojas EXISTENCIAS, MM60, OCUPACION, MAPA).
La app lee los datos crudos y hace el mismo cálculo que las fórmulas del Excel:
- Cada ubicación cae en el prefijo más largo de MAPA con el que empieza.
- Posiciones ocupadas = ubicaciones distintas con existencia.
- Capacidad = columna CAPACIDAD (UBIC.) del detalle de OCUPACION.
- Índice = ocupadas ÷ capacidad (solo clasificaciones con capacidad).

## Qué trae
- Indicadores, detalle por clasificación (tabla principal) y resumen por zona.
- Filtros por zona, clasificación, nivel, ABC y almacén; todas las gráficas cambian con ellos:
  mapa del almacén (bloques por capacidad y ocupación), ocupadas vs. libres por zona,
  ABC por zona, ítems por posición y posiciones por prefijo.
- Detalle de cada clasificación con sus ubicaciones y materiales.
- Revisión (ubicaciones fuera del MAPA, clasificaciones sin prefijo, etc.), exportar a Excel e imprimir.

## Desarrollo
```
npm install
npm run dev        # http://localhost:3000
npm run build
```
Prueba de paridad contra las fórmulas del Excel (el segundo archivo debe estar guardado/recalculado por Excel):
```
npx tsx scripts/paridad.ts Indice.xlsx Indice_recalculado.xlsx
```
