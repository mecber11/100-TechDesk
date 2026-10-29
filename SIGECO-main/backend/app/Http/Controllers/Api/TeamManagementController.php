<?php

namespace App\Http\Controllers\Api;

use App\Business\Teams\TeamManagementService;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TeamManagementController extends Controller
{
    public function __construct(private readonly TeamManagementService $teams) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->teams->members($request->user()));
    }

    public function pending(Request $request): JsonResponse
    {
        return response()->json($this->teams->pending($request->user()));
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['slack_user_id' => strtoupper(trim((string) $request->input('slack_user_id', '')))]);
        $request->validate(['slack_user_id' => ['required', 'string', 'regex:/^[UW][A-Z0-9]{8,29}$/', 'unique:pgsql.sec.usuarios,slack_user_id']]);
        return response()->json($this->teams->createMember($request->user(), $request->all()), 201);
    }

    public function slack(Request $request, int $id): JsonResponse
    {
        $request->merge(['slack_user_id' => strtoupper(trim((string) $request->input('slack_user_id', '')))]);
        $data = $request->validate(['slack_user_id' => [
            'required', 'string', 'regex:/^[UW][A-Z0-9]{8,29}$/',
            Rule::unique('pgsql.sec.usuarios', 'slack_user_id')->ignore($id, 'id_usuario'),
        ]]);
        $this->teams->updateSlack($request->user(), $id, $data['slack_user_id']);
        return response()->json(['message' => 'ID de Slack actualizado.']);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        return response()->json(['message' => $this->teams->changeStatus($request->user(), $id, 'approved')]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        return response()->json(['message' => $this->teams->changeStatus($request->user(), $id, 'rejected')]);
    }

    public function suspend(Request $request, int $id): JsonResponse
    {
        return response()->json(['message' => $this->teams->changeStatus($request->user(), $id, 'suspended')]);
    }

    public function reactivate(Request $request, int $id): JsonResponse
    {
        return response()->json(['message' => $this->teams->changeStatus($request->user(), $id, 'approved')]);
    }

    public function remove(Request $request, int $id): JsonResponse
    {
        return response()->json(['message' => $this->teams->removeMember($request->user(), $id)]);
    }
}
