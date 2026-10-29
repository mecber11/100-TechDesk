<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class MoveInternalOrderRequest extends FormRequest
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
            'attachments.max' => 'Puedes adjuntar hasta 3 archivos por acción.',
        ];
    }

    public function rules(): array
    {
        return [
            'status' => 'required|in:Borrador,Enviado,EnAtencion,Escalado,Atendido,Rechazado,Cerrado',
            'note' => 'nullable|string|max:1000',
            'attachments' => 'nullable|array|max:3',
            'attachments.*' => 'file|max:10240|mimes:pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,jpg,jpeg,png,webp',
            'drive_links' => 'nullable|array|max:5',
            'drive_links.*' => [
                'url:http,https',
                'max:1000',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $host = strtolower((string) parse_url((string) $value, PHP_URL_HOST));
                    if (! in_array($host, ['drive.google.com', 'docs.google.com'], true)) {
                        $fail('El enlace debe pertenecer a Google Drive.');
                    }
                },
            ],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            if (in_array($this->string('status')->toString(), ['Escalado', 'Atendido', 'Rechazado'], true)
                && blank($this->input('note'))) {
                $validator->errors()->add('note', 'Debes registrar una nota para esta acción.');
            }
        }];
    }
}
