<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:pgsql.sec.usuarios,correo',
            'password' => 'required|string|min:8',
            'area' => 'required|string|max:40',
            'slack_user_id' => ['required', 'string', 'regex:/^[UW][A-Z0-9]{8,29}$/', 'unique:pgsql.sec.usuarios,slack_user_id'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['slack_user_id' => strtoupper(trim((string) $this->input('slack_user_id', '')))]);
    }
}
