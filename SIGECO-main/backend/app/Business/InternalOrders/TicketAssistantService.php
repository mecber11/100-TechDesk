<?php

namespace App\Business\InternalOrders;

use App\Business\Areas\AreaContextService;
use App\Domain\Sec\User;

class TicketAssistantService
{
    // Terms describe each area's operational remit. Specific phrases carry more weight.
    private const AREAS = [
        'ADM' => [
            'name' => 'Administración',
            'purpose' => 'Compras, insumos de oficina, papelería, logística, proveedores y documentos administrativos.',
            'terms' => [
                'compra' => 4, 'compras' => 4, 'proveedor' => 3, 'proveedores' => 3,
                'logistica' => 4, 'insumo' => 4, 'insumos' => 4, 'oficina' => 2,
                'papeleria' => 5, 'utiles' => 4, 'limpieza' => 4, 'sede' => 3,
                'alquiler' => 4, 'mantenimiento' => 3, 'caja chica' => 5,
                'documento administrativo' => 5, 'recurso' => 2,
            ],
        ],
        'VENTAS' => [
            'name' => 'Ventas',
            'purpose' => 'Clientes, cotizaciones, propuestas comerciales, prospectos, leads y pedidos comerciales.',
            'terms' => [
                'cliente' => 4, 'clientes' => 4, 'cotizacion' => 5, 'cotizaciones' => 5,
                'venta' => 4, 'ventas' => 4, 'comercial' => 4, 'propuesta comercial' => 5,
                'pedido comercial' => 5, 'prospecto' => 5, 'prospectos' => 5, 'lead' => 4,
                'leads' => 4, 'catalogo de venta' => 4, 'lista de precios' => 4,
            ],
        ],
        'MKT' => [
            'name' => 'Marketing',
            'purpose' => 'Estrategias de marketing, campañas publicitarias, pauta publicitaria, redes sociales, promociones y difusión comercial.',
            'terms' => [
                'publicidad' => 5, 'campana' => 5, 'campana publicitaria' => 5,
                'redes sociales' => 5, 'post' => 4, 'posts' => 4,
                'pauta' => 5, 'pauta publicitaria' => 5, 'facebook ads' => 5,
                'tiktok ads' => 5, 'difusion' => 4, 'promocion' => 4,
                'marketing' => 5, 'estrategia' => 4, 'lanzamiento' => 4,
                'contenido publicitario' => 5, 'engagement' => 4,
            ],
        ],
        'DIS' => [
            'name' => 'Diseño',
            'purpose' => 'Creación y diseño de imágenes, modificación de imágenes y fotos del curso, portadas, retoques fotográficos y piezas gráficas.',
            'terms' => [
                'diseno' => 5, 'disenar' => 5, 'disena' => 5, 'disenador' => 5, 'diseno grafico' => 5,
                'creacion de imagenes' => 6, 'diseno de imagenes' => 6, 'modificacion de imagenes' => 6,
                'modificar fotos' => 6, 'fotos del curso' => 6, 'foto del curso' => 6,
                'portada' => 5, 'portadas' => 5, 'portadas del curso' => 6, 'portada del curso' => 6,
                'imagen' => 4, 'imagenes' => 4, 'foto' => 4, 'fotos' => 4, 'fotografia' => 4,
                'retoque' => 5, 'retoques' => 5, 'retocar' => 5, 'retocar fotos' => 6,
                'banner' => 5, 'banners' => 5, 'flyer' => 5, 'flyers' => 5,
                'afiche' => 5, 'afiches' => 5, 'marco' => 4, 'marcos' => 4,
                'logo' => 5, 'logos' => 5, 'logotipo' => 5, 'artes graficas' => 5,
                'ilustracion' => 5, 'plantilla' => 4,
            ],
        ],
        'TI' => [
            'name' => 'TI',
            'purpose' => 'Página web, intranet, correos, cuentas, usuarios, contraseñas, errores en pantalla, equipos y redes.',
            'terms' => [
                'pagina web' => 5, 'web' => 4, 'cronograma' => 4, 'cronogramas' => 4,
                'actualizar cronograma' => 5, 'actualizar cronogramas' => 5, 'actualizen cronogramas' => 5,
                'intranet' => 5, 'correo' => 5, 'correos' => 5, 'email' => 4,
                'correo corporativo' => 5, 'usuario' => 4, 'usuarios' => 4,
                'contrasena' => 5, 'contrasenas' => 5, 'clave' => 4, 'claves' => 4,
                'password' => 5, 'acceso' => 4, 'accesos' => 4, 'acceso al sistema' => 5,
                'permiso de acceso' => 5, 'bloqueo' => 4, 'error' => 4, 'falla' => 4,
                'bug' => 4, 'error tecnico' => 5, 'error en pantalla' => 5,
                'error 500' => 5, 'error 404' => 5, 'pantalla azul' => 5,
                'sistema' => 3, 'software' => 4, 'inoperativo' => 4, 'caido' => 4,
                'computadora' => 5, 'laptop' => 5, 'pc' => 4, 'equipo informatico' => 5,
                'impresora' => 5, 'toner' => 4, 'internet' => 5, 'red' => 4,
                'wifi' => 5, 'servidor' => 5, 'vpn' => 5, 'formateo' => 5,
            ],
        ],
        'RRHH' => [
            'name' => 'Recursos Humanos',
            'purpose' => 'Personal, colaboradores, contratos laborales, vacaciones, permisos, tardanzas, asistencia y planillas.',
            'terms' => [
                'personal' => 3, 'colaborador' => 4, 'colaboradores' => 4, 'trabajador' => 3,
                'contratacion' => 5, 'contrato laboral' => 5, 'vacaciones' => 5,
                'asistencia' => 4, 'tardanza' => 4, 'tardanzas' => 4, 'permiso laboral' => 5,
                'permisos' => 4, 'falta' => 3, 'descanso medico' => 5, 'nomina' => 5,
                'planilla' => 5, 'boleta de pago' => 5, 'capacitacion' => 4,
                'constancia de trabajo' => 5, 'induccion' => 4, 'cese' => 4,
            ],
        ],
        'CONT' => [
            'name' => 'Contabilidad',
            'purpose' => 'Facturación, boletas, comprobantes de pago, SUNAT, detracciones, impuestos y reembolsos.',
            'terms' => [
                'factura' => 5, 'facturas' => 5, 'facturacion' => 5, 'boleta' => 4,
                'boletas' => 4, 'comprobante' => 5, 'comprobantes' => 5, 'pago' => 4,
                'pagos' => 4, 'sunat' => 5, 'impuesto' => 5, 'impuestos' => 5,
                'detraccion' => 5, 'detracciones' => 5, 'retencion' => 5,
                'reembolso' => 5, 'reembolsos' => 5, 'nota de credito' => 5,
                'presupuesto' => 4, 'contabilidad' => 4, 'balance' => 4,
            ],
        ],
        'PSICO' => [
            'name' => 'Psicología',
            'purpose' => 'Bienestar emocional, orientación psicológica, salud mental, estrés, clima laboral y apoyo al equipo.',
            'terms' => [
                'bienestar emocional' => 5, 'orientacion psicologica' => 5,
                'psicologia' => 5, 'psicologico' => 5, 'salud mental' => 5,
                'estres' => 4, 'ansiedad' => 4, 'apoyo emocional' => 5,
                'clima laboral' => 4, 'contencion' => 4, 'pausa activa' => 4,
                'escucha activa' => 4, 'evaluacion psicologica' => 5,
            ],
        ],
    ];

    public function __construct(private readonly AreaContextService $areas) {}

    public function suggest(string $description, User $user, ?int $fromAreaId = null, ?string $preferredAreaCode = null, array $evidenceNames = []): array
    {
        $origin = $this->areas->isCompanyAdmin($user) && $fromAreaId
            ? $this->areas->byId($fromAreaId)
            : $this->areas->area($user);
        $originCode = $origin?->codigo;
        $activeCodes = $this->areas->active()->pluck('codigo')->all();

        $textToAnalyze = trim($description . ' ' . implode(' ', array_filter($evidenceNames)));
        $normalized = $this->normalize($textToAnalyze);

        $scores = [];
        $matches = [];
        foreach (self::AREAS as $code => $definition) {
            if (! in_array($code, $activeCodes, true) || $code === $originCode) continue;
            $scores[$code] = 0;
            $matches[$code] = [];
            foreach ($definition['terms'] as $term => $weight) {
                $normTerm = $this->normalize($term);
                if (str_contains($normalized, $normTerm)) {
                    $scores[$code] += $weight;
                    $matches[$code][] = $term;
                }
            }
        }
        arsort($scores);
        $bestCode = array_key_first($scores);
        $top = $bestCode ? $scores[$bestCode] : 0;
        $second = count($scores) > 1 ? array_values($scores)[1] : 0;
        $clear = $top >= 3 && ($top >= $second + 1 || count($scores) === 1);
        $fallback = in_array('TI', $activeCodes, true) && $originCode !== 'TI' ? 'TI' : ($bestCode ?: ($activeCodes[0] ?? null));
        $preferredAreaCode = strtoupper(trim((string) $preferredAreaCode));
        $explicitArea = $preferredAreaCode !== ''
            && in_array($preferredAreaCode, $activeCodes, true)
            && $preferredAreaCode !== $originCode;
        $code = $explicitArea ? $preferredAreaCode : ($clear ? $bestCode : $fallback);

        $description = trim($description);
        $firstSentence = preg_split('/[.!?\n]/u', $description)[0] ?? '';
        $title = mb_substr(trim($firstSentence) ?: $description, 0, 160);
        $kind = $this->kind($normalized);
        $priority = preg_match('/\b(urgente|emergencia|grave)\b/u', $normalized) ? 'Urgente'
            : (preg_match('/\b(critico|caido|inoperativo|bloqueado|sin internet)\b/u', $normalized) ? 'Alta' : 'Media');

        return [
            'title' => $title,
            'description' => $description,
            'request_type' => 'Ticket',
            'kind' => $kind,
            'priority' => $priority,
            'to_area_code' => $code,
            'confidence' => $explicitArea ? 'alta' : ($clear ? ($top >= 6 ? 'alta' : 'media') : 'baja'),
            'reason' => $explicitArea
                ? 'El área fue indicada por el usuario y se validó como destino disponible.'
                : ($clear && ! empty($matches[$code])
                ? 'La solicitud coincide con: ' . implode(', ', array_unique(array_slice($matches[$code], 0, 5))) . '.'
                : 'Clasificado según las funciones de soporte técnico y requerimientos del sistema.'),
            'alternatives' => collect($scores)->filter(fn ($score) => $score > 0)->take(3)->keys()->values()->all(),
            'areas' => collect(self::AREAS)->filter(fn ($value, $key) => in_array($key, $activeCodes, true))->map(fn ($value, $key) => ['code' => $key, 'name' => $value['name'], 'purpose' => $value['purpose']])->values()->all(),
        ];
    }

    private function normalize(string $text): string
    {
        return mb_strtolower(strtr($text, ['á'=>'a', 'é'=>'e', 'í'=>'i', 'ó'=>'o', 'ú'=>'u', 'ü'=>'u', 'ñ'=>'n', 'Á'=>'a', 'É'=>'e', 'Í'=>'i', 'Ó'=>'o', 'Ú'=>'u', 'Ñ'=>'n']));
    }

    private function kind(string $text): string
    {
        if (preg_match('/\b(error|falla|incidente|inoperativo|caido|pantalla azul|bug)\b/u', $text)) return 'Incidente';
        if (preg_match('/\b(acceso|cuenta|contrasena|claves|password|permiso al sistema|usuario)\b/u', $text)) return 'Acceso';
        if (preg_match('/\b(computadora|laptop|impresora|equipo|teclado|monitor|mouse|toner)\b/u', $text)) return 'Equipo';
        if (preg_match('/\b(software|aplicacion|programa|sistema|web|intranet|correo|cronograma)\b/u', $text)) return 'Software';
        if (preg_match('/\b(documento|constancia|archivo|contrato)\b/u', $text)) return 'Documentación';
        return 'Servicio';
    }
}
