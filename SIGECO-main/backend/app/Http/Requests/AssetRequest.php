<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'codigo_patrimonial' => 'required|string|max:50',
            'numero_serie' => 'nullable|string|max:100',
            'tipo_identificador_externo' => 'nullable|string|in:Serie,ServiceTag,IMEI,MAC,Otro',
            'identificador_alternativo' => 'nullable|string|max:100',
            'emisor_identificador_externo' => 'nullable|string|max:100',
            'id_imagen' => 'nullable|integer',
            'nombre' => 'required|string|max:180',
            'tipo' => 'required|string|max:50',
            'marca' => 'required|string|max:80',
            'modelo' => 'required|string|max:100',
            'especificaciones' => 'nullable|array',
            'estado' => 'nullable|string|in:Disponible,Asignado,Mantenimiento,Baja',
            'condicion_fisica' => 'nullable|string|in:Nuevo,Bueno,Regular,Malo',
            'ubicacion' => 'nullable|string|max:150',
            'fecha_adquisicion' => 'nullable|date',
            'costo_adquisicion' => 'nullable|numeric|min:0',
            'vida_util_meses' => 'nullable|integer|min:1|max:120',
            'notas' => 'nullable|string|max:2000',
        ];
    }
}
