<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AssistInternalOrderRequest extends FormRequest
{
    public function authorize(): bool { return $this->user() !== null; }

    public function rules(): array
    {
        return [
            'description' => 'required|string|min:10|max:5000',
            'from_area_id' => 'nullable|integer',
            'preferred_area_code' => 'nullable|string|max:20',
            'evidence_names' => 'nullable|array',
            'evidence_names.*' => 'nullable|string|max:255',
        ];
    }
}
