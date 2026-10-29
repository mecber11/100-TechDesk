<?php

namespace App\Http\Controllers\Api;

use App\Business\InternalOrders\InternalOrderService;
use App\Business\InternalOrders\TicketAssistantService;
use App\Http\Controllers\Controller;
use App\Http\Requests\MoveInternalOrderRequest;
use App\Http\Requests\StoreInternalOrderRequest;
use App\Http\Requests\AssistInternalOrderRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class InternalOrderController extends Controller
{
    public function __construct(private readonly InternalOrderService $orders) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'status' => ['nullable', 'in:Borrador,Enviado,EnAtencion,Escalado,Atendido,Rechazado,Cerrado'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'day' => ['nullable', 'date_format:Y-m-d'],
            'month' => ['nullable', 'date_format:Y-m'],
            'year' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        return response()->json($this->orders->listForUser(
            $request->user(),
            $filters['status'] ?? null,
            isset($filters['per_page']) ? (int) $filters['per_page'] : 20,
            $filters['day'] ?? null,
            $filters['month'] ?? null,
            isset($filters['year']) ? (int) $filters['year'] : null,
        ));
    }

    public function store(StoreInternalOrderRequest $request): JsonResponse
    {
        return response()->json(
            $this->orders->createForUser($request->validated(), $request->user(), $request->file('attachments', [])),
            201,
        );
    }

    public function show(int $id, Request $request): JsonResponse
    {
        return response()->json($this->orders->getForUser($id, $request->user()));
    }

    public function assist(AssistInternalOrderRequest $request, TicketAssistantService $assistant): JsonResponse
    {
        $data = $request->validated();

        return response()->json($assistant->suggest(
            $data['description'],
            $request->user(),
            $data['from_area_id'] ?? null,
            $data['preferred_area_code'] ?? null,
            $data['evidence_names'] ?? [],
        ));
    }

    public function move(int $id, MoveInternalOrderRequest $request): JsonResponse
    {
        $data = $request->validated();

        return response()->json($this->orders->moveForUser(
            $id,
            $data['status'],
            $data['note'] ?? null,
            $request->file('attachments', []),
            $data['drive_links'] ?? [],
            $request->user(),
        ));
    }

    public function attachment(int $id, Request $request): StreamedResponse
    {
        return $this->orders->downloadAttachmentForUser($id, $request->user(), $request->boolean('download', false));
    }
}
