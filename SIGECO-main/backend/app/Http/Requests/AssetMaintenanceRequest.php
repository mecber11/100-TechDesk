<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssetMaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'id_activo' => 'required|integer',
            'tipo_mantenimiento' => 'required|string|in:Preventivo,Correctivo',
            'titulo' => 'required|string|max:200',
            'descripcion_falla' => 'nullable|string|max:3000',
            'diagnostico_solucion' => 'nullable|string|max:3000',
            'piezas_reemplazadas' => 'nullable|string|max:2000',
            'costo' => 'nullable|numeric|min:0',
            'tecnico_responsable' => 'required|string|max:150',
            'estado' => 'nullable|string|in:Programado,EnProceso,Completado,Cancelado',
            'fecha_programada' => 'required|date',
            'fecha_ejecucion' => 'nullable|date',
            'proximo_mantenimiento_sugerido' => 'nullable|date',
            'observaciones' => 'nullable|string|max:2000',
        ];
    }
}
