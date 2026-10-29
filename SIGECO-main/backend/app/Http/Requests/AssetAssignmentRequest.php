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
            'id_pedido' => 'nullable|integer',
            'fecha_devolucion_estimada' => 'nullable|date',
            'condicion_entrega' => 'nullable|string|max:100',
            'observaciones_entrega' => 'nullable|string|max:2000',
        ];
    }
}
