<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreInternalOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function messages(): array
    {
        return [
            'attachments.*.uploaded' => 'No se pudo cargar el archivo. Comprueba que no supere 10 MB y vuelve a intentarlo.',
            'attachments.*.max' => 'Cada archivo debe pesar como máximo 10 MB.',
            'attachments.*.mimes' => 'El formato del archivo no está permitido.',
            'attachments.max' => 'Puedes adjuntar hasta 5 archivos.',
        ];
    }

    public function rules(): array
    {
        return [
            'from_area_id' => 'nullable|integer',
            'to_area_code' => 'nullable|string|max:20',
            'title' => 'required|string|max:200',
            'description' => 'required|string|max:5000',
            'request_type' => 'required|in:Pedido,Ticket',
            'kind' => 'required|in:Documentación,Equipo,Software,Acceso,Incidente,Servicio,Otro',
            'priority' => 'required|in:Baja,Media,Alta,Urgente',
            'due_on' => 'nullable|date',
            'items' => 'sometimes|array|max:20',
            'items.*.description' => 'required_with:items|string|max:220',
            'items.*.quantity' => 'nullable|numeric|min:0.01',
            'items.*.unit' => 'nullable|string|max:20',
            'attachments' => 'nullable|array|max:5',
            'attachments.*' => 'file|max:10240|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,jpg,jpeg,png,webp',
        ];
    }
}
