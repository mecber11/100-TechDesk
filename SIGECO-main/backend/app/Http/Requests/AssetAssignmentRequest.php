<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssetAssignmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'id_activo' => 'required|integer',
            'id_usuario_asignado' => 'required|integer',
            'id_area_destino' => 'nullable|integer',
            'id_area_solicitante' => 'nullable|integer',
            'id_pedido' => 'nullable|integer',
            'horas_prestamo' => 'nullable|numeric|min:0.1|max:8760',
            'fecha_devolucion_estimada' => 'nullable',
            'condicion_entrega' => 'nullable|string|max:100',
            'observaciones_entrega' => 'nullable|string|max:2000',
        ];
    }
}
