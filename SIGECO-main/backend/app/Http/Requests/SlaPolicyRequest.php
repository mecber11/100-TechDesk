<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SlaPolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'nombre' => 'required|string|max:100',
            'categoria' => 'nullable|string|max:50',
            'prioridad' => 'required|string|in:Urgente,Alta,Media,Baja',
            'tiempo_primera_respuesta_horas' => 'required|numeric|min:0.1|max:720',
            'tiempo_resolucion_horas' => 'required|numeric|min:0.5|max:720',
            'activo' => 'nullable|boolean',
            'descripcion' => 'nullable|string|max:1000',
        ];
    }
}
