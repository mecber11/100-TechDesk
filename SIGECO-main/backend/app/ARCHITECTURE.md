# Arquitectura por capas

El backend mantiene dependencias en una sola dirección:

```text
HTTP (Controllers + FormRequests)
        ↓
Business (casos de uso y reglas)
        ↓
Data/Contracts (puertos de persistencia)
        ↓
Data/Eloquent (consultas y transacciones PostgreSQL)
        ↓
Domain (entidades y relaciones)
```

## Responsabilidades

- `Http/Controllers`: recibe la petición, delega al caso de uso y construye la respuesta HTTP.
- `Http/Requests`: autorización básica y validación del contrato de entrada.
- `Business`: visibilidad por área, transiciones, escalamiento y demás reglas del sistema.
- `Data/Contracts`: interfaces consumidas por los servicios de negocio.
- `Data/Eloquent`: única capa autorizada para ejecutar Eloquent, SQL, funciones y transacciones PostgreSQL.
- `Domain`: modelos y relaciones, sin decisiones de transporte HTTP.

`LayerArchitectureTest` impide que se vuelvan a introducir consultas en controladores o servicios de negocio.
