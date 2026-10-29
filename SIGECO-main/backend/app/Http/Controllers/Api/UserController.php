<?php

namespace App\Http\Controllers\Api;

use App\Business\Users\UserService;
use App\Http\Controllers\Api\Concerns\CrudController;
use Illuminate\Validation\Rule;

class UserController extends CrudController
{
    public function __construct(UserService $service)
    {
        parent::__construct($service);
    }

    protected function rules(bool $partial = false): array
    {
        $userId = request()->route('id');

        return [
            'email' => [
                $partial ? 'sometimes' : 'required',
                'email',
                Rule::unique('pgsql.sec.usuarios', 'correo')->ignore($userId, 'id_usuario'),
            ],
            'full_name' => $partial ? 'sometimes|string|max:160' : 'required|string|max:160',
            'slack_user_id' => [
                $partial ? 'sometimes' : 'required', 'string', 'regex:/^[UW][A-Z0-9]{8,29}$/',
                Rule::unique('pgsql.sec.usuarios', 'slack_user_id')->ignore($userId, 'id_usuario'),
            ],
            'password' => $partial ? 'sometimes|string|min:8' : 'required|string|min:8',
        ];
    }
}
