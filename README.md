# M&R Gestión de Personal

Aplicación privada de gestión de trabajadores y capacitaciones basada en Express, MongoDB y React.

## Instalación

Copiar `backend/.env.example` a `backend/.env` y configurar `MONGODB_URI`.

```bat
cd backend
npm install
npm run dev
```

En otra terminal:

```bat
cd web
npm install
npm start
```

La web usa `http://localhost:4000/api` en desarrollo. Para producción puede establecerse `REACT_APP_API_URL`.

## Seguridad

No existe inicio de sesión. La aplicación debe ejecutarse únicamente en una red privada, detrás de firewall o VPN. En producción `PRIVATE_NETWORK_ONLY=true` bloquea conexiones externas.

## Módulos

- Dashboard Operativo
- Trabajadores
- Capacitaciones
- Reportes
- Configuración
